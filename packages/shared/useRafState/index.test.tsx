import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from 'vitest-browser-react'
import { useRafState } from '../useRafState'

/**
 * Manual `requestAnimationFrame` driver. Real frames are not deterministic in a
 * browser test, and the contract under test *is* the frame scheduling, so the
 * two globals are replaced by an in-memory queue: `flush()` runs every callback
 * that is still scheduled right now, in one `act()` — exactly what a single
 * browser frame does — while a cancelled handle is dropped and never invoked.
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
  /** Run every still-scheduled callback as one frame. */
  flush: (act: (callback: () => unknown) => Promise<void>) => Promise<void>
}

function createFakeFrames(): FakeFrames {
  let nextHandle = 0
  const frames: FakeFrames = {
    requested: [],
    cancelled: [],
    invoked: [],
    pending: new Map(),
    async flush(act) {
      const callbacks = [...frames.pending.entries()]
      frames.pending.clear()
      await act(() => {
        for (const [handle, callback] of callbacks) {
          frames.invoked.push(handle)
          callback(performance.now())
        }
      })
    },
  }

  // `vi.stubGlobal` so `afterEach` restores the real browser globals.
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

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

/** Every state value the hook rendered, in render order. */
function useRafStateSpy(initial: number, renders: number[]) {
  const [state, setRafState] = useRafState(initial)
  renders.push(state)
  return { state, setRafState }
}

describe('useRafState', () => {
  it('defers the update to the next frame instead of committing it synchronously', async () => {
    const frames = createFakeFrames()
    const renders: number[] = []
    const { result, act } = await renderHook(() => useRafStateSpy(0, renders))

    result.current.setRafState(1)

    // scheduled, but not committed: the update belongs to the next frame
    expect(renders).toEqual([0])
    expect(frames.requested).toEqual([1])

    await frames.flush(act)

    expect(renders).toEqual([0, 1])
    expect(result.current.state).toBe(1)
  })

  it('coalesces a burst of updates into a single re-render carrying the last value', async () => {
    const frames = createFakeFrames()
    const renders: number[] = []
    const { result, act } = await renderHook(() => useRafStateSpy(0, renders))

    // three calls inside one frame
    result.current.setRafState(1)
    result.current.setRafState(2)
    result.current.setRafState(3)

    // each call cancels the handle scheduled before it, so exactly one callback
    // survives; the first cancel targets the never-requested handle `0`, which
    // is upstream's `useRef(0)` initial value
    expect(frames.requested).toEqual([1, 2, 3])
    expect(frames.cancelled).toEqual([0, 1, 2])
    expect(frames.pending.size).toBe(1)

    await frames.flush(act)

    // render count, not just the value: one re-render, carrying `3`
    expect(renders).toEqual([0, 3])
    expect(result.current.state).toBe(3)
    // and only the surviving callback ran
    expect(frames.invoked).toEqual([3])
  })

  it('cancels the superseded frame so only the newest callback runs', async () => {
    const frames = createFakeFrames()
    const renders: number[] = []
    const { result, act } = await renderHook(() => useRafStateSpy(0, renders))

    result.current.setRafState(10)
    const first = frames.requested[0]!
    result.current.setRafState(20)
    const second = frames.requested[1]!

    expect(frames.cancelled).toEqual([0, first])
    expect(frames.pending.has(first)).toBe(false)
    expect(frames.pending.has(second)).toBe(true)

    await frames.flush(act)

    expect(frames.invoked).toEqual([second])
    expect(renders).toEqual([0, 20])
  })

  it('forwards the updater form through the frame callback, so it sees the state the previous frame committed', async () => {
    const frames = createFakeFrames()
    const renders: number[] = []
    const { result, act } = await renderHook(() => useRafStateSpy(0, renders))

    // two updaters scheduled in the same frame: per upstream only the last
    // callback survives, so the updater runs once — not twice
    result.current.setRafState(prev => prev + 1)
    result.current.setRafState(prev => prev + 1)
    await frames.flush(act)
    expect(renders).toEqual([0, 1])

    // a fresh episode on the next frame: the updater observes the fresh state
    // committed above (`prev === 1`, not the initial `0`)
    result.current.setRafState(prev => prev + 1)
    await frames.flush(act)
    expect(renders).toEqual([0, 1, 2])

    // a value and an updater in the same frame: the value call is superseded
    // and never reaches `setState`, so the updater starts from `2`
    result.current.setRafState(99)
    result.current.setRafState(prev => prev + 1)
    await frames.flush(act)
    expect(renders).toEqual([0, 1, 2, 3])
    expect(result.current.state).toBe(3)
  })

  it('cancels the pending frame on unmount', async () => {
    const frames = createFakeFrames()
    const renders: number[] = []
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { result, act, unmount } = await renderHook(() => useRafStateSpy(0, renders))

    result.current.setRafState(1)
    const handle = frames.requested[0]!
    expect(frames.pending.has(handle)).toBe(true)

    await unmount()

    // `useUnmount` cancelled the outstanding frame, so nothing is left to run
    expect(frames.cancelled).toContain(handle)
    expect(frames.pending.size).toBe(0)

    await frames.flush(act)

    expect(frames.invoked).toEqual([])
    expect(renders).toEqual([0])
    expect(errorSpy).not.toHaveBeenCalled()
  })

  it('cancels every frame it superseded, so unmount leaves nothing pending', async () => {
    const frames = createFakeFrames()
    const renders: number[] = []
    const { result, act, unmount } = await renderHook(() => useRafStateSpy(0, renders))

    result.current.setRafState(1)
    result.current.setRafState(2)

    await unmount()
    await frames.flush(act)

    // the superseded first frame must have been cancelled when it was replaced,
    // not only the last one on unmount
    expect(frames.invoked).toEqual([])
    expect(renders).toEqual([0])
  })

  it('returns a referentially stable setter across re-renders', async () => {
    const frames = createFakeFrames()
    const renders: number[] = []
    const { result, act, rerender } = await renderHook(() => useRafStateSpy(0, renders))

    const setter = result.current.setRafState

    await rerender()
    expect(result.current.setRafState).toBe(setter)

    // a frame commit re-renders the hook, and the setter identity survives it
    result.current.setRafState(1)
    await frames.flush(act)
    expect(renders).toEqual([0, 0, 1])
    expect(result.current.setRafState).toBe(setter)

    // it stays stable while a frame is merely scheduled
    result.current.setRafState(2)
    expect(result.current.setRafState).toBe(setter)
    await frames.flush(act)
    expect(renders).toEqual([0, 0, 1, 2])
  })

  it('supports a lazy initial-state factory', async () => {
    const frames = createFakeFrames()
    let factoryCalls = 0
    const renders: number[] = []
    const { result, act } = await renderHook(() => {
      const [state, setRafState] = useRafState(() => {
        factoryCalls += 1
        return 42
      })
      renders.push(state)
      return { state, setRafState }
    })

    // upstream hands the factory straight to `useState`: it is called lazily,
    // and the initial render already carries its result
    expect(factoryCalls).toBe(1)
    expect(renders).toEqual([42])
    expect(result.current.state).toBe(42)

    result.current.setRafState(0)
    await frames.flush(act)
    expect(renders).toEqual([42, 0])
  })
})
