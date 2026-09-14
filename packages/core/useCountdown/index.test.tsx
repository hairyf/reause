import type { Dispatch, SetStateAction } from 'react'
import type { UseCountdownOptions, UseCountdownReturn } from '../useCountdown'
import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest'
import { renderHook } from 'vitest-browser-react'
import { useCountdown } from '../useCountdown'

describe('useCountdown', () => {
  let tickCallback = vi.fn<() => void>()
  let completeCallback = vi.fn<() => void>()
  let countdown = 3
  let interval = 100
  let options: UseCountdownOptions

  beforeEach(() => {
    vi.useFakeTimers()

    tickCallback = vi.fn<() => void>()
    completeCallback = vi.fn<() => void>()
    countdown = 3
    interval = 100
    options = {
      interval,
      onComplete: completeCallback,
      onTick: tickCallback,
    }
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  interface HookCtx {
    result: { current: UseCountdownReturn }
    act: (callback: () => unknown) => Promise<void>
  }

  // upstream starts the countdown on setup (immediate scheduler); here the
  // timer only runs after an explicit `start()`
  async function exec({ result, act }: HookCtx) {
    await act(() => result.current[2].start())
    expect(result.current[2].isActive).toBeTruthy()
    expect(completeCallback).toHaveBeenCalledTimes(0)

    await act(() => {
      vi.advanceTimersByTime(110)
    })
    expect(tickCallback).toHaveBeenCalledTimes(1)

    await act(() => result.current[2].pause())
    expect(result.current[2].isActive).toBeFalsy()

    await act(() => {
      vi.advanceTimersByTime(110)
    })
    expect(tickCallback).toHaveBeenCalledTimes(1)

    await act(() => result.current[2].resume())
    expect(result.current[2].isActive).toBeTruthy()

    await act(() => {
      vi.advanceTimersByTime(110)
    })
    expect(tickCallback).toHaveBeenCalledTimes(2)

    await act(() => {
      vi.advanceTimersByTime(110)
    })
    expect(tickCallback).toHaveBeenCalledTimes(3)
    expect(completeCallback).toHaveBeenCalledTimes(1)
  }

  it('basic start/stop', async () => {
    const { result, act, unmount } = await renderHook(() => useCountdown(countdown, options))
    expect(result.current[2].isActive).toBeFalsy()
    expect(completeCallback).toHaveBeenCalledTimes(0)

    await act(() => result.current[2].start())
    expect(result.current[2].isActive).toBeTruthy()
    expect(completeCallback).toHaveBeenCalledTimes(0)

    await act(() => {
      vi.advanceTimersByTime(110)
    })

    expect(tickCallback).toHaveBeenCalledTimes(1)
    expect(completeCallback).toHaveBeenCalledTimes(0)

    await act(() => result.current[2].stop())
    expect(result.current[2].isActive).toBeFalsy()
    await act(() => {
      vi.advanceTimersByTime(110)
    })

    expect(tickCallback).toHaveBeenCalledTimes(1)
    expect(result.current[0]).toBe(countdown)

    tickCallback.mockClear()
    completeCallback.mockClear()

    await act(() => result.current[2].start())

    expect(result.current[2].isActive).toBeTruthy()
    await act(() => {
      vi.advanceTimersByTime(210)
    })

    expect(tickCallback).toHaveBeenCalledTimes(2)
    expect(completeCallback).toHaveBeenCalledTimes(0)

    expect(result.current[0]).toBe(1)

    await act(() => {
      vi.advanceTimersByTime(110)
    })
    expect(result.current[0]).toBe(0)
    expect(completeCallback).toHaveBeenCalledTimes(1)

    await unmount()
  })

  it('basic pause/resume', async () => {
    const { result, act, unmount } = await renderHook(() => useCountdown(countdown, options))
    await exec({ result, act })
    await unmount()
  })

  it('pause/resume in scope', async () => {
    const { result, act, unmount } = await renderHook(() => useCountdown(countdown, options))
    await exec({ result, act })
    tickCallback.mockClear()
    // unmounting disposes the hook's resources (upstream: `effectScope` stop)
    await unmount()
    vi.advanceTimersByTime(300)
    expect(tickCallback).toHaveBeenCalledTimes(0)
  })

  it('cant work when interval is negative', async () => {
    const { result, act, unmount } = await renderHook(() => useCountdown(5, { interval: -1 }))

    await act(() => result.current[2].start())
    expect(result.current[2].isActive).toBeFalsy()
    await act(() => {
      vi.advanceTimersByTime(60)
    })
    expect(tickCallback).toHaveBeenCalledTimes(0)

    await unmount()
  })

  it('a changed countdown prop does not change the setup value used by start()', async () => {
    const { result, act, rerender, unmount } = await renderHook(
      ({ countdown }: { countdown: number } = { countdown: 3 }) => useCountdown(countdown, options),
      { initialProps: { countdown: 3 } },
    )

    // the countdown argument is a plain value captured at setup: start() still
    // counts down from 3, so 210ms only reaches 1 remaining
    await rerender({ countdown: 2 })
    await act(() => result.current[2].start())
    await act(() => {
      vi.advanceTimersByTime(210)
    })
    expect(completeCallback).toHaveBeenCalledTimes(0)

    await act(() => {
      vi.advanceTimersByTime(interval)
    })
    expect(completeCallback).toHaveBeenCalledTimes(1)

    await unmount()
  })

  it('start can provide a custom countdown', async () => {
    const { result, act, unmount } = await renderHook(() => useCountdown(countdown, options))
    await act(() => result.current[2].start())
    await act(() => {
      vi.advanceTimersByTime(countdown * interval + 10)
    })
    expect(completeCallback).toHaveBeenCalledTimes(1)

    await act(() => result.current[2].start(1))
    await act(() => {
      vi.advanceTimersByTime(110)
    })
    expect(completeCallback).toHaveBeenCalledTimes(2)

    await act(() => result.current[2].start())
    await act(() => {
      vi.advanceTimersByTime(110)
    })
    expect(completeCallback).toHaveBeenCalledTimes(2)
    await act(() => {
      vi.advanceTimersByTime(countdown * interval + 10)
    })
    expect(completeCallback).toHaveBeenCalledTimes(3)

    await act(() => result.current[2].start(1))
    await act(() => result.current[2].reset())
    await act(() => {
      vi.advanceTimersByTime(110)
    })
    expect(completeCallback).toHaveBeenCalledTimes(3)

    await unmount()
  })

  it('plain-number initial countdown is pinned to the setup value', async () => {
    const { result, act, rerender, unmount } = await renderHook(
      (props?: { countdown?: number }) => useCountdown(props?.countdown ?? countdown, options),
      { initialProps: { countdown } },
    )

    // upstream's reset closes over the setup argument, so a later
    // plain-number prop change is not picked up by no-arg start()/reset()
    await rerender({ countdown: 1 })

    await act(() => result.current[2].reset())
    expect(result.current[0]).toBe(countdown)

    await act(() => result.current[2].start())
    await act(() => {
      vi.advanceTimersByTime(2 * interval + 10)
    })
    expect(completeCallback).toHaveBeenCalledTimes(0)
    expect(result.current[0]).toBe(1)

    await act(() => {
      vi.advanceTimersByTime(interval + 10)
    })
    expect(completeCallback).toHaveBeenCalledTimes(1)

    await unmount()
  })

  it('setRemaining updates the returned value', async () => {
    const { result, act, unmount } = await renderHook(() => useCountdown(countdown, options))

    await act(() => result.current[1](10))
    expect(result.current[0]).toBe(10)

    // functional updates compose, like any React state setter
    await act(() => result.current[1](prev => prev - 4))
    expect(result.current[0]).toBe(6)

    // a manual write composes with the running interval: the next tick
    // decrements from the written value
    await act(() => result.current[2].start(5))
    await act(() => result.current[1](9))
    expect(result.current[0]).toBe(9)

    await act(() => {
      vi.advanceTimersByTime(110)
    })
    expect(tickCallback).toHaveBeenCalledTimes(1)
    expect(result.current[0]).toBe(8)

    await unmount()
  })

  it('controls keep the countdown API working', async () => {
    const { result, act, unmount } = await renderHook(() => useCountdown(countdown, options))

    expect(Object.keys(result.current[2]).sort()).toEqual(['isActive', 'pause', 'reset', 'resume', 'start', 'stop'])
    expect(result.current[2].isActive).toBeFalsy()

    await act(() => result.current[2].start())
    expect(result.current[2].isActive).toBeTruthy()

    await act(() => {
      vi.advanceTimersByTime(110)
    })
    expect(result.current[0]).toBe(countdown - 1)

    await act(() => result.current[2].pause())
    expect(result.current[2].isActive).toBeFalsy()

    await act(() => result.current[2].resume())
    expect(result.current[2].isActive).toBeTruthy()

    await act(() => result.current[2].reset())
    expect(result.current[0]).toBe(countdown)

    await act(() => result.current[2].stop())
    expect(result.current[2].isActive).toBeFalsy()
    expect(result.current[0]).toBe(countdown)

    await act(() => {
      vi.advanceTimersByTime(110)
    })
    expect(tickCallback).toHaveBeenCalledTimes(1)

    await unmount()
  })

  it('returns a React tuple [remaining, setRemaining, controls]', async () => {
    const { result, unmount } = await renderHook(() => useCountdown(countdown, options))

    expectTypeOf(result.current).toEqualTypeOf<UseCountdownReturn>()
    expectTypeOf(result.current).toEqualTypeOf<
      readonly [
        number,
        Dispatch<SetStateAction<number>>,
        {
          reset: (countdown?: number) => void
          stop: () => void
          start: (countdown?: number) => void
          pause: () => void
          resume: () => void
          isActive: boolean
        },
      ]
    >()
    expectTypeOf(result.current[0]).toEqualTypeOf<number>()
    expectTypeOf(result.current[1]).toEqualTypeOf<Dispatch<SetStateAction<number>>>()
    expectTypeOf(result.current[2].isActive).toEqualTypeOf<boolean>()
    expectTypeOf(result.current[2].start).toEqualTypeOf<(countdown?: number) => void>()

    expect(Array.isArray(result.current)).toBe(true)
    expect(result.current).toHaveLength(3)
    expect(result.current[0]).toBe(countdown)
    expect(result.current[1]).toBeTypeOf('function')
    expect(result.current[2].isActive).toBe(false)

    await unmount()
  })
})
