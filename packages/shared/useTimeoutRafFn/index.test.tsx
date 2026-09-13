import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from 'vitest-browser-react'
import { useTimeoutRafFn } from '../useTimeoutRafFn'

/** One frame at 60fps, rounded to an integer so the deadline arithmetic is exact. */
const FRAME_TIME = 16
/** Not a multiple of the frame time: three frames (48ms) miss it, four (64ms) cross it. */
const DELAY = 50

type Act = (callback: () => unknown) => Promise<void>

/**
 * Manual `requestAnimationFrame` driver plus a manual clock.
 *
 * Real frames are not deterministic in a browser test, and the contract under
 * test *is* the frame scheduling, so both globals are replaced by an in-memory
 * queue. The clock matters just as much: the pinned hook measures elapsed time
 * with `Date.now()` — never with the frame timestamp the browser passes in —
 * so `frame()` advances `Date.now` and hands the callback the same value, and a
 * port that switched to the rAF timestamp would be caught here.
 */
interface FakeFrames {
  /** Handles handed out by `requestAnimationFrame`, in request order. */
  requested: number[]
  /** Handles passed to `cancelAnimationFrame`, in call order. */
  cancelled: number[]
  /** Handles whose callback actually ran, in invocation order. */
  invoked: number[]
  /** Callbacks still scheduled for the upcoming frame. */
  pending: Map<number, FrameRequestCallback>
  /** Advance the clock by `ms`, then run every still-scheduled callback as one frame. */
  frame: (act: Act, ms?: number) => Promise<void>
}

function createFakeFrames(): FakeFrames {
  let now = Date.parse('2024-01-01T00:00:00Z')
  let nextHandle = 0
  const frames: FakeFrames = {
    requested: [],
    cancelled: [],
    invoked: [],
    pending: new Map(),
    async frame(act, ms = FRAME_TIME) {
      now += ms
      const callbacks = [...frames.pending.entries()]
      frames.pending.clear()
      await act(() => {
        for (const [handle, callback] of callbacks) {
          frames.invoked.push(handle)
          callback(now)
        }
      })
    },
  }

  // `vi.stubGlobal` so `afterEach` restores the real browser globals; the
  // `Date.now` spy makes the hook's clock the driver's clock.
  vi.spyOn(Date, 'now').mockImplementation(() => now)
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    const handle = ++nextHandle
    frames.requested.push(handle)
    frames.pending.set(handle, callback)
    return handle
  })
  vi.stubGlobal('cancelAnimationFrame', (handle: number) => {
    frames.cancelled.push(handle)
    frames.pending.delete(handle)
  })

  return frames
}

let frames: FakeFrames

beforeEach(() => {
  frames = createFakeFrames()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('useTimeoutRafFn', () => {
  it('fires the callback once, on the first frame at or after delay, then never again', async () => {
    const callback = vi.fn()
    const { act, unmount } = await renderHook(() => useTimeoutRafFn(callback, DELAY))

    // armed once by the mount effect; the render phase scheduled nothing
    expect(frames.requested).toHaveLength(1)
    expect(callback).not.toHaveBeenCalled()

    // three frames (48ms) stay short of the 50ms deadline: each re-arms exactly
    // one follow-up frame and the callback keeps silent
    for (let index = 0; index < 3; index += 1)
      await frames.frame(act)
    expect(callback).not.toHaveBeenCalled()
    expect(frames.requested).toHaveLength(4)

    // the fourth frame (64ms) crosses the deadline: it fires once and stops by
    // construction — no further frame is requested and none stays pending
    await frames.frame(act)
    expect(callback).toHaveBeenCalledTimes(1)
    expect(frames.requested).toHaveLength(4)
    expect(frames.pending.size).toBe(0)

    // ten more frames and ten more clock advances: a one-shot timeout is gone
    for (let index = 0; index < 10; index += 1)
      await frames.frame(act)
    expect(callback).toHaveBeenCalledTimes(1)
    expect(frames.requested).toHaveLength(4)

    await unmount()
  })

  it('fires on the very first frame when delay is 0 (the >= deadline comparison)', async () => {
    const callback = vi.fn()
    const { act, unmount } = await renderHook(() => useTimeoutRafFn(callback, 0))

    await frames.frame(act)
    expect(callback).toHaveBeenCalledTimes(1)

    await frames.frame(act)
    expect(callback).toHaveBeenCalledTimes(1)

    await unmount()
  })

  it('disables the timeout when delay is undefined (upstream: no timer is armed)', async () => {
    const callback = vi.fn()
    const { act, unmount } = await renderHook(() => useTimeoutRafFn(callback, undefined))

    expect(frames.requested).toEqual([])

    for (let index = 0; index < 5; index += 1)
      await frames.frame(act)
    expect(callback).not.toHaveBeenCalled()
    expect(frames.requested).toEqual([])

    await unmount()
  })

  it.each([
    ['NaN', Number.NaN],
    ['negative', -1],
  ])('disables the timeout for a %s delay', async (_label, delay) => {
    const callback = vi.fn()
    const { act, unmount } = await renderHook(() => useTimeoutRafFn(callback, delay))

    expect(frames.requested).toEqual([])

    for (let index = 0; index < 5; index += 1)
      await frames.frame(act)
    expect(callback).not.toHaveBeenCalled()
    expect(frames.requested).toEqual([])

    await unmount()
  })

  it('clear() cancels the pending timeout, returns void, and is stable across renders', async () => {
    const callback = vi.fn()
    const { result, rerender, act, unmount } = await renderHook(() => useTimeoutRafFn(callback, DELAY))
    const clear = result.current
    const handle = frames.requested[0]!
    expect(frames.pending.has(handle)).toBe(true)

    await rerender()
    expect(result.current).toBe(clear)

    let returned: unknown
    await act(() => {
      returned = result.current()
    })

    expect(returned).toBeUndefined()
    expect(frames.cancelled).toContain(handle)
    expect(frames.pending.size).toBe(0)

    for (let index = 0; index < 5; index += 1)
      await frames.frame(act)
    expect(callback).not.toHaveBeenCalled()

    await unmount()
  })

  it('reads the callback through useLatest: a new inline fn neither restarts the timeout nor runs stale', async () => {
    const first = vi.fn()
    const second = vi.fn()
    const { rerender, act, unmount } = await renderHook(
      ({ fn }: { fn: () => void } = { fn: first }) => useTimeoutRafFn(fn, DELAY),
      { initialProps: { fn: first } },
    )

    for (let index = 0; index < 3; index += 1)
      await frames.frame(act)
    expect(frames.requested).toHaveLength(4)
    expect(frames.cancelled).toEqual([])

    // a re-render with a brand-new inline callback: the armed timeout survives —
    // no cancel, no re-arm — because the effect depends on `delay` alone
    await rerender({ fn: second })
    expect(frames.cancelled).toEqual([])
    expect(frames.requested).toHaveLength(4)

    // the next frame crosses the ORIGINAL 50ms deadline, and the newest
    // function is the one that runs
    await frames.frame(act)
    expect(second).toHaveBeenCalledTimes(1)
    expect(first).not.toHaveBeenCalled()

    // still one-shot
    for (let index = 0; index < 3; index += 1)
      await frames.frame(act)
    expect(second).toHaveBeenCalledTimes(1)
    expect(first).not.toHaveBeenCalled()

    await unmount()
  })

  it('cancels the pending frame on unmount, firing nothing afterwards', async () => {
    const callback = vi.fn()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { act, unmount } = await renderHook(() => useTimeoutRafFn(callback, DELAY))
    const handle = frames.requested[0]!
    expect(frames.pending.has(handle)).toBe(true)

    await unmount()

    expect(frames.cancelled).toContain(handle)
    expect(frames.pending.size).toBe(0)

    for (let index = 0; index < 5; index += 1)
      await frames.frame(act)
    expect(callback).not.toHaveBeenCalled()
    expect(errorSpy).not.toHaveBeenCalled()
  })
})

describe('useTimeoutRafFn (no requestAnimationFrame — the setTimeout downgrade)', () => {
  /** Upstream's node environment: neither frame global exists. */
  function removeFrameGlobals() {
    vi.useFakeTimers()
    vi.stubGlobal('requestAnimationFrame', undefined)
    vi.stubGlobal('cancelAnimationFrame', undefined)
  }

  it('downgrades to setTimeout when requestAnimationFrame is undefined, and still fires once', async () => {
    removeFrameGlobals()
    const callback = vi.fn()
    const { act, unmount } = await renderHook(() => useTimeoutRafFn(callback, DELAY))

    // no frame was requested: the downgrade branch is the only one that ran
    expect(frames.requested).toEqual([])
    expect(callback).not.toHaveBeenCalled()

    await act(() => {
      vi.advanceTimersByTime(DELAY + 1)
    })
    expect(callback).toHaveBeenCalledTimes(1)

    // one-shot here too: the setTimeout is consumed, so more time changes nothing
    await act(() => {
      vi.advanceTimersByTime(DELAY * 4)
    })
    expect(callback).toHaveBeenCalledTimes(1)

    await unmount()
  })

  it('clear() cancels the pending fallback setTimeout', async () => {
    removeFrameGlobals()
    const callback = vi.fn()
    const { result, act, unmount } = await renderHook(() => useTimeoutRafFn(callback, DELAY))

    await act(() => {
      result.current()
    })

    await act(() => {
      vi.advanceTimersByTime(DELAY * 4)
    })
    expect(callback).not.toHaveBeenCalled()

    await unmount()
  })

  it('renders with no frame globals at all: the render phase touches neither and arms nothing', async () => {
    removeFrameGlobals()
    const callback = vi.fn()

    function Page() {
      const clear = useTimeoutRafFn(callback, DELAY)
      return (
        <button type="button" onClick={() => clear()}>
          server
        </button>
      )
    }

    // `renderToString` runs the render phase only — effects never run, exactly
    // like a server render with no `window`. A render-phase call of
    // `requestAnimationFrame` would throw here, and a render-phase `setTimeout`
    // would leave a pending fake timer behind.
    expect(renderToString(<Page />)).toBe('<button type="button">server</button>')
    expect(callback).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)

    // and the hook installed or patched no global of its own
    expect(typeof requestAnimationFrame).toBe('undefined')
    expect(typeof cancelAnimationFrame).toBe('undefined')
  })
})
