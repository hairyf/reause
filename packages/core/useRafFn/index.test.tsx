import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from 'vitest-browser-react'
import { useRafFn } from '../useRafFn'

/**
 * Replaces the browser frame clock with a manual one so a test can deliver
 * exact frame timestamps. The real `requestAnimationFrame` fires at the
 * display refresh rate: a `vi.waitFor` would resume after an arbitrary number
 * of frames, so the framerate comparisons observed equal call counts whenever
 * both loops had only run once.
 */
function installManualFrames() {
  let nextId = 0
  const callbacks = new Map<number, FrameRequestCallback>()

  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    const id = ++nextId
    callbacks.set(id, callback)
    return id
  })
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
    callbacks.delete(id)
  })

  const frame = (timestamp: number) => {
    // snapshot first: a callback may schedule the next frame while running
    const scheduled = [...callbacks.values()]
    callbacks.clear()
    for (const callback of scheduled)
      callback(timestamp)
  }

  return {
    /** deliver one frame with `timestamp` to every scheduled callback */
    frame,
    /** deliver the frames at each timestamp, in order */
    frames: (timestamps: number[]) => timestamps.forEach(frame),
  }
}

describe('useRafFn', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should be defined', () => {
    expect(useRafFn).toBeDefined()
  })

  it('should call the passed function', async () => {
    const fn = vi.fn()
    await renderHook(() => useRafFn(fn))
    await vi.waitFor(() => {
      expect(fn).toHaveBeenCalled()
    })
  })

  it('should immediately be active', async () => {
    const { result } = await renderHook(() => useRafFn(() => {}))
    expect(result.current.isActive).toBe(true)
  })

  it('should not be immediately active with options.immediate=false', async () => {
    const { result } = await renderHook(() => useRafFn(() => {}, { immediate: false }))
    expect(result.current.isActive).toBe(false)
  })

  it('should not stop the loop when immediate turns false after mount (read once, like upstream)', async () => {
    const frames = installManualFrames()
    const fn = vi.fn()
    const { result, rerender, act } = await renderHook(
      (props?: { immediate: boolean }) => useRafFn(fn, { immediate: props?.immediate }),
      { initialProps: { immediate: true } },
    )
    expect(result.current.isActive).toBe(true)

    // upstream reads `immediate` once at setup — a later false must not pause
    // the running loop (the effect is keyed on the stable controls only)
    await rerender({ immediate: false })
    expect(result.current.isActive).toBe(true)
    await act(() => {
      frames.frames([0, 16, 32])
    })
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('should not start the loop when immediate turns true after mount (read once, like upstream)', async () => {
    const frames = installManualFrames()
    const fn = vi.fn()
    const { result, rerender, act } = await renderHook(
      (props?: { immediate: boolean }) => useRafFn(fn, { immediate: props?.immediate }),
      { initialProps: { immediate: false } },
    )
    expect(result.current.isActive).toBe(false)

    // a later true must not start a loop that never ran
    await rerender({ immediate: true })
    expect(result.current.isActive).toBe(false)
    await act(() => {
      frames.frames([0, 16, 32])
    })
    expect(fn).not.toHaveBeenCalled()
  })

  it('should not be active after pause', async () => {
    const { result, act } = await renderHook(() => useRafFn(() => {}))
    expect(result.current.isActive).toBe(true)
    await act(async () => {
      result.current.pause()
    })
    expect(result.current.isActive).toBe(false)
  })

  it('should be active after resume', async () => {
    const { result, act } = await renderHook(() => useRafFn(() => {}))
    expect(result.current.isActive).toBe(true)
    await act(async () => {
      result.current.pause()
    })
    expect(result.current.isActive).toBe(false)
    await act(async () => {
      result.current.resume()
    })
    expect(result.current.isActive).toBe(true)
  })

  it('should be active after resume and immediate false', async () => {
    const { result, act } = await renderHook(() => useRafFn(() => {}, { immediate: false }))
    expect(result.current.isActive).toBe(false)
    await act(async () => {
      result.current.resume()
    })
    expect(result.current.isActive).toBe(true)
  })

  it('should call the function with delta and timestamp', async () => {
    const fn = vi.fn()
    await renderHook(() => useRafFn(fn))
    await vi.waitFor(() => {
      expect(fn).toHaveBeenCalled()
    })
    expect(fn.mock.calls[0][0]?.delta).toBeDefined()
    expect(fn.mock.calls[0][0]?.timestamp).toBeDefined()
  })

  it('should apply a framerate', async () => {
    const frames = installManualFrames()
    const fn1 = vi.fn()
    const fn2 = vi.fn()
    await renderHook(() => useRafFn(fn1, { fpsLimit: 20 }))
    const { act } = await renderHook(() => useRafFn(fn2, { fpsLimit: 60 }))

    // 10ms steps: the 20fps loop (50ms interval) fires twice, the 60fps loop
    // (16.7ms interval) fires five times — deterministic, not frame-clock bound
    await act(() => {
      frames.frames([0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110])
    })

    expect(fn1).toHaveBeenCalled()
    expect(fn2).toHaveBeenCalled()
    expect(fn1.mock.calls.length).toBeLessThan(fn2.mock.calls.length)
  })

  it('should handle a null fpsLimit as no limit', async () => {
    const fn = vi.fn()
    await renderHook(() => useRafFn(fn, { fpsLimit: null }))
    await vi.waitFor(() => {
      expect(fn).toHaveBeenCalled()
    })
  })

  it('should handle a framerate change', async () => {
    const frames = installManualFrames()
    const initialFramerate = 60
    const fn1 = vi.fn()
    const fn2 = vi.fn()
    const { rerender } = await renderHook(
      ({ fpsLimit }: { fpsLimit: number } = { fpsLimit: initialFramerate }) => useRafFn(fn1, { fpsLimit }),
      { initialProps: { fpsLimit: initialFramerate } },
    )
    const { act } = await renderHook(() => useRafFn(fn2, { fpsLimit: initialFramerate }))

    await act(() => {
      frames.frames([0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110])
    })
    expect(fn1).toHaveBeenCalled()
    expect(fn2).toHaveBeenCalled()
    expect(fn1.mock.calls.length).toBe(fn2.mock.calls.length)

    // clearAllMocks drops the call history, not the manual frame clock
    await rerender({ fpsLimit: 20 })
    vi.clearAllMocks()
    await act(() => {
      frames.frames([200, 210, 220, 230, 240, 250, 260, 270, 280, 290, 300, 310])
    })

    expect(fn1).toHaveBeenCalled()
    expect(fn2).toHaveBeenCalled()
    expect(fn1.mock.calls.length).toBeLessThan(fn2.mock.calls.length)
  })

  it('should only be called once when the once option is set to true', async () => {
    const frames = installManualFrames()
    const fn = vi.fn()
    const fn1 = vi.fn()
    await renderHook(() => useRafFn(fn, { once: true }))
    const { act } = await renderHook(() => useRafFn(fn1))

    await act(() => {
      frames.frames([0, 20, 40, 60, 80, 100, 120, 140, 160, 180])
    })

    expect(fn.mock.calls.length).toBe(1)
    expect(fn1.mock.calls.length).toBeGreaterThan(1)
  })
})
