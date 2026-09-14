import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, renderHook } from 'vitest-browser-react'
import { useThrottleFn } from '../useThrottleFn'

describe('useThrottleFn', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should be defined', () => {
    expect(useThrottleFn).toBeDefined()
  })

  it('should work', async () => {
    const callback = vi.fn()
    const ms = 20
    const { result, act } = await renderHook(() => useThrottleFn(callback, ms))

    await act(async () => {
      result.current()
    })
    await act(async () => {
      result.current()
    })
    expect(callback).toHaveBeenCalledTimes(1)

    await act(async () => {
      vi.advanceTimersByTime(ms + 10)
    })
    expect(callback).toHaveBeenCalledTimes(2)

    await act(async () => {
      result.current()
    })
    await act(async () => {
      vi.advanceTimersByTime(ms + 10)
    })
    expect(callback).toHaveBeenCalledTimes(3)
  })

  it('should work with trailing', async () => {
    const callback = vi.fn()
    const ms = 20
    const { result, act } = await renderHook(() => useThrottleFn(callback, ms, true))

    await act(async () => {
      result.current()
    })
    await act(async () => {
      result.current()
    })
    expect(callback).toHaveBeenCalledTimes(1)

    await act(async () => {
      vi.advanceTimersByTime(ms + 10)
    })
    expect(callback).toHaveBeenCalledTimes(2)
  })

  it('should work with leading', async () => {
    const callback = vi.fn()
    const ms = 20
    const { result, act } = await renderHook(() => useThrottleFn(callback, ms, false, true))

    await act(async () => {
      result.current()
    })
    expect(callback).toHaveBeenCalledTimes(1)
    await act(async () => {
      result.current()
    })
    await act(async () => {
      result.current()
    })
    expect(callback).toHaveBeenCalledTimes(1)

    await act(async () => {
      vi.advanceTimersByTime(ms + 10)
    })
    await act(async () => {
      result.current()
    })
    expect(callback).toHaveBeenCalledTimes(2)
    await act(async () => {
      result.current()
    })
    await act(async () => {
      result.current()
    })
    expect(callback).toHaveBeenCalledTimes(2)

    await act(async () => {
      vi.advanceTimersByTime(ms + 10)
    })
    await act(async () => {
      result.current()
    })
    expect(callback).toHaveBeenCalledTimes(3)
  })

  it('should work with not leading and not trailing', async () => {
    const callback = vi.fn()
    const ms = 20
    const { result, act } = await renderHook(() => useThrottleFn(callback, ms, false, false))

    await act(async () => {
      result.current()
    })
    await act(async () => {
      result.current()
    })
    expect(callback).toHaveBeenCalledTimes(0)

    await act(async () => {
      vi.advanceTimersByTime(ms + 10)
    })
    await act(async () => {
      result.current()
    })
    await act(async () => {
      result.current()
    })
    await act(async () => {
      result.current()
    })
    expect(callback).toHaveBeenCalledTimes(0)

    await act(async () => {
      vi.advanceTimersByTime(ms + 20)
    })
    await act(async () => {
      result.current()
    })
    expect(callback).toHaveBeenCalledTimes(0)
  })

  it('invokes the leading call immediately and resolves with its result', async () => {
    const calls: number[] = []
    let pending!: Promise<unknown>
    const { result, act } = await renderHook(() =>
      useThrottleFn((n: number) => {
        calls.push(n)
        return n * 2
      }, 100))

    await act(async () => {
      pending = result.current(21)
    })
    expect(calls).toEqual([21])
    expect(await pending).toBe(42)
  })

  it('coalesces calls inside the window into one trailing invoke', async () => {
    const calls: number[] = []
    let first!: Promise<unknown>
    let superseded!: Promise<unknown>
    let pending!: Promise<unknown>
    const { result, act } = await renderHook(() =>
      useThrottleFn((n: number) => {
        calls.push(n)
        return n
      }, 100))

    await act(async () => {
      first = result.current(1)
      superseded = result.current(2)
      pending = result.current(3)
    })
    expect(calls).toEqual([1])

    await act(async () => {
      vi.advanceTimersByTime(100)
    })
    expect(calls).toEqual([1, 3])
    expect(await first).toBe(1)
    // the superseded trailing call settles without invoking
    expect(await superseded).toBe(undefined)
    expect(await pending).toBe(3)
  })

  it('re-reads ms from the latest render on every call', async () => {
    const calls: number[] = []
    const { result, act, rerender } = await renderHook(
      ({ ms }: { ms: number } = { ms: 100 }) => useThrottleFn((n: number) => {
        calls.push(n)
      }, ms),
      { initialProps: { ms: 100 } },
    )

    await act(async () => {
      result.current(1)
    })
    expect(calls).toEqual([1])

    await act(async () => {
      result.current(2)
    })
    await act(async () => {
      vi.advanceTimersByTime(100)
    })
    expect(calls).toEqual([1, 2])

    await rerender({ ms: 300 })
    await act(async () => {
      vi.advanceTimersByTime(400)
    })
    await act(async () => {
      result.current(3)
    })
    expect(calls).toEqual([1, 2, 3])
    await act(async () => {
      result.current(4)
    })
    await act(async () => {
      vi.advanceTimersByTime(100)
    })
    expect(calls).toEqual([1, 2, 3])

    await act(async () => {
      vi.advanceTimersByTime(200)
    })
    expect(calls).toEqual([1, 2, 3, 4])
  })

  it('applies a longer ms from the latest render to the pending window', async () => {
    const calls: number[] = []
    const { result, act, rerender } = await renderHook(
      ({ ms }: { ms: number } = { ms: 100 }) => useThrottleFn((n: number) => {
        calls.push(n)
      }, ms),
      { initialProps: { ms: 100 } },
    )

    await act(async () => {
      result.current(1)
    })
    expect(calls).toEqual([1])

    await rerender({ ms: 300 })
    await act(async () => {
      result.current(2)
    })
    await act(async () => {
      vi.advanceTimersByTime(100)
    })
    expect(calls).toEqual([1])

    await act(async () => {
      vi.advanceTimersByTime(200)
    })
    expect(calls).toEqual([1, 2])
  })

  it('keeps a stable identity across re-renders', async () => {
    const { result, rerender } = await renderHook(() => useThrottleFn(vi.fn(), 100))
    const first = result.current

    await rerender()

    expect(result.current).toBe(first)
  })

  it('clears the pending trailing invoke on unmount', async () => {
    const calls: number[] = []
    const { result, act, unmount } = await renderHook(() =>
      useThrottleFn((n: number) => {
        calls.push(n)
      }, 100))

    await act(async () => {
      result.current(1)
    })
    expect(calls).toEqual([1])
    await act(async () => {
      result.current(2)
    })
    await unmount()

    await act(async () => {
      vi.advanceTimersByTime(1000)
    })
    expect(calls).toEqual([1])
  })

  it('rejects the superseded trailing promise with rejectOnCancel', async () => {
    const calls: number[] = []
    let outcome!: Promise<string>
    const { result, act } = await renderHook(() =>
      useThrottleFn((n: number) => {
        calls.push(n)
        return n
      }, 100, true, true, true))

    await act(async () => {
      result.current(1)
    })
    await act(async () => {
      outcome = result.current(2).then(() => 'resolved', () => 'rejected')
    })
    await act(async () => {
      result.current(3)
    })
    expect(await outcome).toBe('rejected')

    await act(async () => {
      vi.advanceTimersByTime(100)
    })
    expect(calls).toEqual([1, 3])
  })
})

describe('useThrottleFn (component)', () => {
  function UseThrottleFnDemo() {
    const [clicked, setClicked] = useState(0)
    const [updated, setUpdated] = useState(0)
    // a burst of clicks must stay inside one throttle window even on a loaded
    // runner, so the window is far larger than any three-click sequence
    const throttledFn = useThrottleFn(() => setUpdated(v => v + 1), 60_000, false)

    return (
      <div>
        <button onClick={() => {
          setClicked(c => c + 1)
          throttledFn()
        }}
        >
          Smash me!
        </button>
        <p>
          Button clicked:
          {' '}
          {clicked}
        </p>
        <p>
          Event handler called:
          {' '}
          {updated}
        </p>
      </div>
    )
  }

  it('throttles a burst of clicks into a single update', async () => {
    const screen = await render(<UseThrottleFnDemo />)
    const smash = screen.getByRole('button', { name: 'Smash me!' })

    await smash.click()
    await smash.click()
    await smash.click()

    await expect.element(screen.getByText('Button clicked: 3')).toBeVisible()
    await expect.element(screen.getByText('Event handler called: 1')).toBeVisible()
  })
})
