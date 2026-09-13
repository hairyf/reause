import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from 'vitest-browser-react'
import { useIntervalRafFn } from '../useIntervalRafFn'

/** One frame at 60fps, rounded to an integer so the deadline arithmetic is exact. */
const FRAME_TIME = 16
/** Not a multiple of the frame time: four frames (64ms) cross it, three (48ms) miss it. */
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

describe('useIntervalRafFn', () => {
  it('fires repeatedly on successive deadlines instead of once (the pin resets `start` after each fire)', async () => {
    const callback = vi.fn()
    const { act, unmount } = await renderHook(() => useIntervalRafFn(callback, DELAY))

    // armed once by the mount effect; the render phase scheduled nothing
    expect(frames.requested).toHaveLength(1)
    expect(callback).not.toHaveBeenCalled()

    // three frames (48ms) stay short of the 50ms deadline
    for (let index = 0; index < 3; index += 1)
      await frames.frame(act)
    expect(callback).not.toHaveBeenCalled()

    // the fourth frame (64ms) crosses it: fire #1, and the loop re-arms
    await frames.frame(act)
    expect(callback).toHaveBeenCalledTimes(1)
    expect(frames.pending.size).toBe(1)

    // UPSTREAM'S QUIRK, measured: `start` restarts from the frame that fired
    // (64ms), so the next deadline is 64 + 50 = 114ms — frame 8 (128ms), not
    // frame 7 (112ms). The period is `delay` rounded up to a whole frame.
    for (let index = 0; index < 3; index += 1)
      await frames.frame(act)
    expect(callback).toHaveBeenCalledTimes(1)

    await frames.frame(act)
    expect(callback).toHaveBeenCalledTimes(2)

    // and it keeps going: three more deadline crossings, three more fires
    for (let index = 0; index < 12; index += 1)
      await frames.frame(act)
    expect(callback).toHaveBeenCalledTimes(5)

    await unmount()
  })

  it('fires on every frame when delay is 0 (the >= deadline comparison)', async () => {
    const callback = vi.fn()
    const { act, unmount } = await renderHook(() => useIntervalRafFn(callback, 0))

    for (let index = 1; index <= 5; index += 1) {
      await frames.frame(act)
      expect(callback).toHaveBeenCalledTimes(index)
    }

    await unmount()
  })

  it('runs fn synchronously and exactly once before the first frame when `immediate` is set', async () => {
    const callback = vi.fn()
    const { act, unmount } = await renderHook(() => useIntervalRafFn(callback, DELAY, { immediate: true }))

    // the effect called it before arming the loop: a render-phase call would
    // have happened before the hook returned, and a frame-phase call would be
    // counted at the first `frame()` below instead
    expect(callback).toHaveBeenCalledTimes(1)
    expect(frames.requested).toHaveLength(1)

    // the immediate call does NOT reset the deadline: the first fire still
    // lands on the frame that crosses the original 50ms
    for (let index = 0; index < 3; index += 1)
      await frames.frame(act)
    expect(callback).toHaveBeenCalledTimes(1)

    await frames.frame(act)
    expect(callback).toHaveBeenCalledTimes(2)

    await unmount()
  })

  it('disables the loop when delay is undefined (upstream: nothing is armed)', async () => {
    const callback = vi.fn()
    const { act, unmount } = await renderHook(() => useIntervalRafFn(callback, undefined))

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
  ])('disables the loop for a %s delay', async (_label, delay) => {
    const callback = vi.fn()
    const { act, unmount } = await renderHook(() => useIntervalRafFn(callback, delay))

    expect(frames.requested).toEqual([])

    for (let index = 0; index < 5; index += 1)
      await frames.frame(act)
    expect(callback).not.toHaveBeenCalled()
    expect(frames.requested).toEqual([])

    await unmount()
  })

  it('clear() stops the loop, returns void, and is stable across renders', async () => {
    const callback = vi.fn()
    const { result, rerender, act, unmount } = await renderHook(() => useIntervalRafFn(callback, DELAY))
    const clear = result.current
    expect(frames.pending.size).toBe(1)

    await rerender()
    expect(result.current).toBe(clear)

    let returned: unknown
    await act(() => {
      returned = result.current()
    })
    expect(returned).toBeUndefined()

    // clearing before the first fire means no fire at all — and no fire after
    // any number of later frames either, unlike its one-shot sibling this loop
    // would otherwise have gone on forever
    for (let index = 0; index < 10; index += 1)
      await frames.frame(act)
    expect(callback).not.toHaveBeenCalled()
    expect(frames.pending.size).toBe(0)

    await unmount()
  })

  it('can be cleared from inside its own callback; the freshly re-armed frame is the one cancelled (upstream test)', async () => {
    const callback = vi.fn()
    const { result, act, unmount } = await renderHook(() =>
      useIntervalRafFn(() => {
        callback()
        result.current()
      }, DELAY),
    )

    expect(callback).not.toHaveBeenCalled()

    await frames.frame(act)
    expect(callback).not.toHaveBeenCalled()

    // the frame that crosses the deadline fires the callback, which clears —
    // and the loop really stops, because upstream re-arms BEFORE the deadline
    // test, so `handle.id` already names the next frame when the callback runs
    for (let index = 0; index < 4; index += 1)
      await frames.frame(act)
    expect(callback).toHaveBeenCalledTimes(1)

    for (let index = 0; index < 10; index += 1)
      await frames.frame(act)
    expect(callback).toHaveBeenCalledTimes(1)

    await unmount()
  })

  it('reads the callback through useLatest: a new inline fn neither restarts the loop nor runs stale', async () => {
    const first = vi.fn()
    const second = vi.fn()
    const { rerender, act, unmount } = await renderHook(
      ({ fn }: { fn: () => void } = { fn: first }) => useIntervalRafFn(fn, DELAY),
      { initialProps: { fn: first } },
    )

    for (let index = 0; index < 3; index += 1)
      await frames.frame(act)
    expect(frames.requested).toHaveLength(4)
    expect(frames.cancelled).toEqual([])

    // a re-render with a brand-new inline callback: the armed loop survives —
    // no cancel, no re-arm — because the effect depends on `delay` alone
    await rerender({ fn: second })
    expect(frames.cancelled).toEqual([])
    expect(frames.requested).toHaveLength(4)

    // the next frame crosses the ORIGINAL 50ms deadline, and the newest
    // function is the one that runs
    await frames.frame(act)
    expect(second).toHaveBeenCalledTimes(1)
    expect(first).not.toHaveBeenCalled()

    // and the loop keeps running the newest one, still without re-arming: one
    // request per frame from here on (frame 4 through frame 12), plus the one
    // armed at mount
    for (let index = 0; index < 8; index += 1)
      await frames.frame(act)
    expect(second).toHaveBeenCalledTimes(3)
    expect(first).not.toHaveBeenCalled()
    expect(frames.requested).toHaveLength(13)

    await unmount()
  })

  it('re-arms from scratch, and cancels the pending frame, when delay changes', async () => {
    const callback = vi.fn()
    const { rerender, act, unmount } = await renderHook(
      ({ delay }: { delay: number | undefined } = { delay: DELAY }) => useIntervalRafFn(callback, delay),
      { initialProps: { delay: DELAY as number | undefined } },
    )
    const armed = frames.requested[0]!

    await rerender({ delay: 200 })
    expect(frames.cancelled).toContain(armed)
    expect(frames.pending.size).toBe(1)

    // 12 frames (192ms) are still short of the new 200ms deadline
    for (let index = 0; index < 12; index += 1)
      await frames.frame(act)
    expect(callback).not.toHaveBeenCalled()

    await frames.frame(act)
    expect(callback).toHaveBeenCalledTimes(1)

    // and switching to a disabling value stops it
    await rerender({ delay: undefined })
    for (let index = 0; index < 10; index += 1)
      await frames.frame(act)
    expect(callback).toHaveBeenCalledTimes(1)

    await unmount()
  })

  it('cancels the pending frame on unmount, firing nothing afterwards', async () => {
    const callback = vi.fn()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { act, unmount } = await renderHook(() => useIntervalRafFn(callback, DELAY))
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

describe('useIntervalRafFn (no requestAnimationFrame — the setInterval downgrade)', () => {
  /** Upstream's node environment: neither frame global exists. */
  function removeFrameGlobals() {
    vi.useFakeTimers()
    vi.stubGlobal('requestAnimationFrame', undefined)
    vi.stubGlobal('cancelAnimationFrame', undefined)
  }

  it('downgrades to setInterval when requestAnimationFrame is undefined, and keeps firing', async () => {
    removeFrameGlobals()
    const callback = vi.fn()
    const { act, unmount } = await renderHook(() => useIntervalRafFn(callback, DELAY))

    // no frame was requested: the downgrade branch is the only one that ran
    expect(frames.requested).toEqual([])
    expect(callback).not.toHaveBeenCalled()

    await act(() => {
      vi.advanceTimersByTime(DELAY + 1)
    })
    expect(callback).toHaveBeenCalledTimes(1)

    // repeating here too — where the one-shot sibling would have stopped
    await act(() => {
      vi.advanceTimersByTime(DELAY * 3)
    })
    expect(callback).toHaveBeenCalledTimes(4)

    await unmount()
  })

  it('clear() cancels the pending fallback setInterval', async () => {
    removeFrameGlobals()
    const callback = vi.fn()
    const { result, act, unmount } = await renderHook(() => useIntervalRafFn(callback, DELAY))

    await act(() => {
      result.current()
    })

    await act(() => {
      vi.advanceTimersByTime(DELAY * 4)
    })
    expect(callback).not.toHaveBeenCalled()

    await unmount()
  })

  it('clears the fallback interval on unmount', async () => {
    removeFrameGlobals()
    const callback = vi.fn()
    const { unmount } = await renderHook(() => useIntervalRafFn(callback, DELAY))

    await unmount()
    expect(vi.getTimerCount()).toBe(0)

    vi.advanceTimersByTime(DELAY * 4)
    expect(callback).not.toHaveBeenCalled()
  })

  it('renders with no frame globals at all: the render phase touches neither and arms nothing', async () => {
    removeFrameGlobals()
    const callback = vi.fn()

    function Page() {
      const clear = useIntervalRafFn(callback, DELAY)
      return (
        <button type="button" onClick={() => clear()}>
          server
        </button>
      )
    }

    // `renderToString` runs the render phase only — effects never run, exactly
    // like a server render with no `window`. A render-phase call of
    // `requestAnimationFrame` would throw here, and a render-phase `setInterval`
    // would leave a pending fake timer behind.
    expect(renderToString(<Page />)).toBe('<button type="button">server</button>')
    expect(callback).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)

    // and the hook installed or patched no global of its own
    expect(typeof requestAnimationFrame).toBe('undefined')
    expect(typeof cancelAnimationFrame).toBe('undefined')

    // HONEST LIMIT: `vi.getTimerCount() === 0` is the real evidence that the
    // render phase armed nothing. `window`/`document` cannot be shown absent
    // here — a browser-mode test runs inside a real document — so this test
    // proves the *frame* globals are untouched, not that `window` is never
    // referenced. The hook only touches `Date`, `requestAnimationFrame` and
    // `setInterval`.
  })
})
