import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, renderHook } from 'vitest-browser-react'
import { useTimeout } from '../useTimeout'

describe('useTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('flips ready to true after the interval (immediate by default)', async () => {
    const { result, act } = await renderHook(() => useTimeout(10))
    expect(result.current).toBe(false)

    await act(async () => {
      vi.advanceTimersByTime(10)
    })
    expect(result.current).toBe(true)
  })

  it('exposes ready/isPending with controls', async () => {
    const { result, act } = await renderHook(() => useTimeout(10, { controls: true }))
    expect(result.current.ready).toBe(false)
    expect(result.current.isPending).toBe(true)

    await act(async () => {
      vi.advanceTimersByTime(10)
    })
    expect(result.current.ready).toBe(true)
    expect(result.current.isPending).toBe(false)
  })

  it('accepts a plain-number interval', async () => {
    const ms = 20
    const { result, act } = await renderHook(() => useTimeout(ms))
    expect(result.current).toBe(false)

    await act(async () => {
      vi.advanceTimersByTime(20)
    })
    expect(result.current).toBe(true)
  })

  it('invokes the callback when the timeout fires', async () => {
    const calls: number[] = []
    const { act } = await renderHook(() => useTimeout(10, { callback: () => calls.push(1) }))

    await act(async () => {
      vi.advanceTimersByTime(10)
    })
    expect(calls).toEqual([1])
  })

  it('immediateCallback fires the callback synchronously on start', async () => {
    const calls: number[] = []
    const { result, act } = await renderHook(() =>
      useTimeout(10, { controls: true, immediateCallback: true, callback: () => calls.push(1) }))

    // mount with immediate → start() fires the callback synchronously
    expect(calls).toEqual([1])
    expect(result.current.isPending).toBe(true)

    await act(async () => {
      vi.advanceTimersByTime(10)
    })
    expect(calls).toEqual([1, 1])
  })

  it('stop() cancels the timer and ready follows isPending', async () => {
    const calls: number[] = []
    const { result, act } = await renderHook(() =>
      useTimeout(10, { controls: true, callback: () => calls.push(1) }))

    await act(async () => {
      result.current.stop()
    })
    // upstream derives ready as `!isPending` — stopping leaves ready === true
    expect(result.current.ready).toBe(true)
    expect(result.current.isPending).toBe(false)

    await act(async () => {
      vi.advanceTimersByTime(100)
    })
    expect(result.current.ready).toBe(true)
    expect(calls).toEqual([])
  })

  it('start() (re)starts the timer', async () => {
    const { result, act } = await renderHook(() => useTimeout(10, { controls: true }))

    await act(async () => {
      vi.advanceTimersByTime(10)
    })
    expect(result.current.ready).toBe(true)

    await act(async () => {
      result.current.start()
    })
    expect(result.current.ready).toBe(false)
    expect(result.current.isPending).toBe(true)

    await act(async () => {
      vi.advanceTimersByTime(10)
    })
    expect(result.current.ready).toBe(true)
  })

  it('immediate: false does not start automatically', async () => {
    const { result, act } = await renderHook(() =>
      useTimeout(10, { controls: true, immediate: false }))

    // upstream: ready is `!isPending` — nothing is pending before start()
    expect(result.current.ready).toBe(true)
    expect(result.current.isPending).toBe(false)

    await act(async () => {
      vi.advanceTimersByTime(1000)
    })
    expect(result.current.ready).toBe(true)

    await act(async () => {
      result.current.start()
    })
    expect(result.current.ready).toBe(false)
    expect(result.current.isPending).toBe(true)

    await act(async () => {
      vi.advanceTimersByTime(10)
    })
    expect(result.current.ready).toBe(true)
  })

  it('stops the timer on unmount', async () => {
    const calls: number[] = []
    const { result, unmount } = await renderHook(() =>
      useTimeout(10, { controls: true, callback: () => calls.push(1) }))
    expect(result.current.ready).toBe(false)

    await unmount()
    vi.advanceTimersByTime(100)
    expect(calls).toEqual([])
  })

  describe('useTimeout (component)', () => {
    function UseTimeoutDemo() {
      const { ready, start } = useTimeout(100, { controls: true })
      return (
        <div>
          <span>{ready ? 'ready!' : 'waiting...'}</span>
          <button disabled={!ready} onClick={() => start()}>Start Again</button>
        </div>
      )
    }

    it('becomes ready after the interval and restarts on demand', async () => {
      const screen = await render(<UseTimeoutDemo />)

      await expect.element(screen.getByText('waiting...')).toBeVisible()
      await expect.element(screen.getByRole('button', { name: 'Start Again' })).toBeDisabled()

      // the timer is faked: fire it explicitly instead of racing a real delay
      await vi.advanceTimersByTimeAsync(100)
      await expect.element(screen.getByText('ready!')).toBeVisible()

      await screen.getByRole('button', { name: 'Start Again' }).click()

      await expect.element(screen.getByText('waiting...')).toBeVisible()
    })
  })
})
