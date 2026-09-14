import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, renderHook } from 'vitest-browser-react'
import { debounceFilter, throttleFilter, useWatchWithFilter } from '../useWatchWithFilter'

interface WatchCall {
  value: number
  oldValue: number | undefined
}

describe('useWatchWithFilter', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('behaves like useWatch by default (no filter)', async () => {
    const calls: WatchCall[] = []
    let setValue: (value: number) => void = () => {}

    const { act } = await renderHook(() => {
      const [value, update] = useState(0)
      setValue = update
      useWatchWithFilter(value, (next, prev) => calls.push({ value: next, oldValue: prev }))
    })

    expect(calls).toEqual([])

    await act(() => setValue(1))
    expect(calls).toEqual([{ value: 1, oldValue: 0 }])

    await act(() => setValue(2))
    expect(calls).toEqual([
      { value: 1, oldValue: 0 },
      { value: 2, oldValue: 1 },
    ])
  })

  it('tracks array sources like useWatch', async () => {
    const calls: Array<{ value: unknown, oldValue: unknown }> = []
    let setCount: (value: number) => void = () => {}
    let setName: (value: string) => void = () => {}

    const { act } = await renderHook(() => {
      const [count, updateCount] = useState(0)
      const [name, updateName] = useState('a')
      setCount = updateCount
      setName = updateName
      useWatchWithFilter([count, name], (next, prev) => calls.push({ value: next, oldValue: prev }))
    })

    await act(() => setName('b'))
    expect(calls).toEqual([{ value: [0, 'b'], oldValue: [0, 'a'] }])

    await act(() => setCount(1))
    expect(calls).toEqual([
      { value: [0, 'b'], oldValue: [0, 'a'] },
      { value: [1, 'b'], oldValue: [0, 'b'] },
    ])
  })

  it('collapses a rapid burst of changes into a single debounced call (debounceFilter)', async () => {
    const calls: WatchCall[] = []
    let setValue: (value: number) => void = () => {}

    const { act } = await renderHook(() => {
      const [value, update] = useState(0)
      setValue = update
      useWatchWithFilter(value, (next, prev) => calls.push({ value: next, oldValue: prev }), { eventFilter: debounceFilter(100) })
    })

    await act(() => setValue(1))
    await act(() => setValue(2))
    await act(() => setValue(3))
    expect(calls).toEqual([])

    await act(async () => {
      vi.advanceTimersByTime(100)
    })
    expect(calls).toEqual([{ value: 3, oldValue: 2 }])

    await act(async () => {
      vi.advanceTimersByTime(1000)
    })
    expect(calls).toEqual([{ value: 3, oldValue: 2 }])
  })

  it('forces the debounced call when maxWait elapses', async () => {
    const calls: WatchCall[] = []
    let setValue: (value: number) => void = () => {}

    const { act } = await renderHook(() => {
      const [value, update] = useState(0)
      setValue = update
      useWatchWithFilter(value, (next, prev) => calls.push({ value: next, oldValue: prev }), { eventFilter: debounceFilter(100, { maxWait: 150 }) })
    })

    await act(() => setValue(1))
    await act(() => setValue(2))
    await act(async () => {
      vi.advanceTimersByTime(100)
    })
    expect(calls).toEqual([{ value: 2, oldValue: 1 }])

    await act(() => setValue(3))
    await act(async () => {
      vi.advanceTimersByTime(80)
    })
    expect(calls).toEqual([{ value: 2, oldValue: 1 }])

    // the burst never settles on its own — maxWait forces the call with the
    // latest (value, oldValue) pair
    await act(() => setValue(4))
    await act(async () => {
      vi.advanceTimersByTime(75)
    })
    expect(calls).toEqual([
      { value: 2, oldValue: 1 },
      { value: 4, oldValue: 3 },
    ])
  })

  it('fires on the leading edge and collapses in-window changes into a trailing call (throttleFilter)', async () => {
    const calls: WatchCall[] = []
    let setValue: (value: number) => void = () => {}

    const { act } = await renderHook(() => {
      const [value, update] = useState(0)
      setValue = update
      useWatchWithFilter(value, (next, prev) => calls.push({ value: next, oldValue: prev }), { eventFilter: throttleFilter(100) })
    })

    // the first change fires immediately on the leading edge
    await act(() => setValue(1))
    expect(calls).toEqual([{ value: 1, oldValue: 0 }])

    // a change inside the window schedules a trailing call
    await act(() => setValue(2))
    await act(async () => {
      vi.advanceTimersByTime(50)
    })
    expect(calls).toEqual([{ value: 1, oldValue: 0 }])

    // re-scheduling inside the window keeps collapsing into one trailing call
    await act(() => setValue(3))
    await act(async () => {
      vi.advanceTimersByTime(50)
    })
    expect(calls).toEqual([
      { value: 1, oldValue: 0 },
      { value: 3, oldValue: 2 },
    ])

    await act(() => setValue(4))
    await act(async () => {
      vi.advanceTimersByTime(110)
    })
    expect(calls).toEqual([
      { value: 1, oldValue: 0 },
      { value: 3, oldValue: 2 },
      { value: 4, oldValue: 3 },
    ])
  })

  it('invokes only at the end of the window with leading: false (throttleFilter)', async () => {
    const calls: WatchCall[] = []
    let setValue: (value: number) => void = () => {}

    const { act } = await renderHook(() => {
      const [value, update] = useState(0)
      setValue = update
      useWatchWithFilter(value, (next, prev) => calls.push({ value: next, oldValue: prev }), { eventFilter: throttleFilter(100, true, false) })
    })

    await act(() => setValue(1))
    await act(() => setValue(2))
    await act(() => setValue(3))
    expect(calls).toEqual([])

    await act(async () => {
      vi.advanceTimersByTime(100)
    })
    expect(calls).toEqual([{ value: 3, oldValue: 2 }])
  })

  it('invokes only at the start of the window with trailing: false (throttleFilter)', async () => {
    const calls: WatchCall[] = []
    let setValue: (value: number) => void = () => {}

    const { act } = await renderHook(() => {
      const [value, update] = useState(0)
      setValue = update
      useWatchWithFilter(value, (next, prev) => calls.push({ value: next, oldValue: prev }), { eventFilter: throttleFilter(100, false, true) })
    })

    await act(() => setValue(1))
    expect(calls).toEqual([{ value: 1, oldValue: 0 }])

    await act(() => setValue(2))
    await act(async () => {
      vi.advanceTimersByTime(100)
    })
    expect(calls).toEqual([{ value: 1, oldValue: 0 }])

    // still inside the window (elapsed === duration) — no leading invoke yet
    await act(() => setValue(3))
    expect(calls).toEqual([{ value: 1, oldValue: 0 }])

    await act(async () => {
      vi.advanceTimersByTime(50)
    })
    await act(() => setValue(4))
    expect(calls).toEqual([
      { value: 1, oldValue: 0 },
      { value: 4, oldValue: 3 },
    ])
  })

  it('fires debounced on mount with immediate: true', async () => {
    const calls: WatchCall[] = []
    let setValue: (value: number) => void = () => {}

    const { act } = await renderHook(() => {
      const [value, update] = useState(0)
      setValue = update
      useWatchWithFilter(value, (next, prev) => calls.push({ value: next, oldValue: prev }), { eventFilter: debounceFilter(100), immediate: true })
    })

    expect(calls).toEqual([])

    await act(async () => {
      vi.advanceTimersByTime(100)
    })
    expect(calls).toEqual([{ value: 0, oldValue: undefined }])

    await act(() => setValue(5))
    await act(async () => {
      vi.advanceTimersByTime(100)
    })
    expect(calls).toEqual([
      { value: 0, oldValue: undefined },
      { value: 5, oldValue: 0 },
    ])
  })

  it('fires right on mount with immediate: true and no filter', async () => {
    const calls: WatchCall[] = []

    await renderHook(() => {
      useWatchWithFilter(0, (next, prev) => calls.push({ value: next, oldValue: prev }), { immediate: true })
    })

    expect(calls).toEqual([{ value: 0, oldValue: undefined }])
  })

  it('stop prevents further fires with the default filter', async () => {
    const calls: number[] = []
    let setValue: (value: number) => void = () => {}
    let stop: () => void = () => {}

    const { act } = await renderHook(() => {
      const [value, update] = useState(0)
      setValue = update
      stop = useWatchWithFilter(value, next => calls.push(next))
    })

    await act(() => setValue(1))
    expect(calls).toEqual([1])

    await act(() => stop())

    await act(() => setValue(2))
    await act(async () => {
      vi.advanceTimersByTime(1000)
    })
    expect(calls).toEqual([1])
  })

  it('stop suppresses a pending debounced call and further changes', async () => {
    const calls: number[] = []
    let setValue: (value: number) => void = () => {}
    let stop: () => void = () => {}

    const { act } = await renderHook(() => {
      const [value, update] = useState(0)
      setValue = update
      stop = useWatchWithFilter(value, next => calls.push(next), { eventFilter: debounceFilter(100) })
    })

    await act(() => setValue(1))
    expect(calls).toEqual([])

    await act(() => stop())

    await act(async () => {
      vi.advanceTimersByTime(100)
    })
    expect(calls).toEqual([])

    await act(() => setValue(2))
    await act(async () => {
      vi.advanceTimersByTime(1000)
    })
    expect(calls).toEqual([])
  })

  it('clears the pending callback on unmount', async () => {
    const calls: number[] = []
    let setValue: (value: number) => void = () => {}

    const { act, unmount } = await renderHook(() => {
      const [value, update] = useState(0)
      setValue = update
      useWatchWithFilter(value, next => calls.push(next), { eventFilter: debounceFilter(100) })
    })

    await act(() => setValue(1))
    await unmount()

    await act(async () => {
      vi.advanceTimersByTime(1000)
    })
    expect(calls).toEqual([])
  })

  it('debounceFilter exposes cancel / flush / isPending controls', async () => {
    // direct filter-level coverage of the `CancelableEventFilter` surface
    const filter = debounceFilter(100)
    const calls: number[] = []
    const invoke = (n: number) => () => calls.push(n)

    filter(invoke(1))
    expect(filter.isPending).toBe(true)

    filter.flush()
    expect(filter.isPending).toBe(false)
    expect(calls).toEqual([1])

    filter(invoke(2))
    expect(filter.isPending).toBe(true)

    filter.cancel()
    expect(filter.isPending).toBe(false)

    await vi.advanceTimersByTimeAsync(1000)
    expect(calls).toEqual([1])

    // a settled timer clears `isPending` on its own
    filter(invoke(3))
    expect(filter.isPending).toBe(true)
    await vi.advanceTimersByTimeAsync(100)
    expect(filter.isPending).toBe(false)
    expect(calls).toEqual([1, 3])
  })

  it('debounceFilter uses its plain-number ms for every call', async () => {
    // `ms` is a plain number read on every call — the same fixed delay applies
    // to each scheduled invoke
    const filter = debounceFilter(100)
    const calls: number[] = []
    const invoke = (n: number) => () => calls.push(n)

    filter(invoke(1))
    await vi.advanceTimersByTimeAsync(50)
    expect(calls).toEqual([])
    await vi.advanceTimersByTimeAsync(50)
    expect(calls).toEqual([1])

    // the next call reads the same delay again
    filter(invoke(2))
    await vi.advanceTimersByTimeAsync(50)
    expect(calls).toEqual([1])
    await vi.advanceTimersByTimeAsync(50)
    expect(calls).toEqual([1, 2])
  })

  it('invokes never with leading: false and trailing: false (throttleFilter)', async () => {
    const calls: WatchCall[] = []
    let setValue: (value: number) => void = () => {}

    const { act } = await renderHook(() => {
      const [value, update] = useState(0)
      setValue = update
      useWatchWithFilter(value, (next, prev) => calls.push({ value: next, oldValue: prev }), { eventFilter: throttleFilter(100, false, false) })
    })

    await act(() => setValue(1))
    await act(() => setValue(2))
    await act(async () => {
      vi.advanceTimersByTime(100)
    })
    await act(() => setValue(3))
    await act(async () => {
      vi.advanceTimersByTime(1000)
    })
    expect(calls).toEqual([])
  })

  it('fires on mount with immediate: true through throttleFilter', async () => {
    const calls: WatchCall[] = []
    let setValue: (value: number) => void = () => {}

    const { act } = await renderHook(() => {
      const [value, update] = useState(0)
      setValue = update
      useWatchWithFilter(value, (next, prev) => calls.push({ value: next, oldValue: prev }), { eventFilter: throttleFilter(100), immediate: true })
    })

    // the mount call passes through the throttle filter — the leading edge of
    // the first call fires immediately (upstream: throttleFilter first call
    // always invokes on the leading edge)
    expect(calls).toEqual([{ value: 0, oldValue: undefined }])

    await act(() => setValue(1))
    await act(async () => {
      vi.advanceTimersByTime(100)
    })
    expect(calls).toEqual([
      { value: 0, oldValue: undefined },
      { value: 1, oldValue: 0 },
    ])
  })
})

describe('useWatchWithFilter (component)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function UseWatchWithFilterDemo() {
    const [count, setCount] = useState(0)
    const [unrelated, setUnrelated] = useState(0)
    const [updates, setUpdates] = useState(0)

    useWatchWithFilter(count, () => setUpdates(v => v + 1), { eventFilter: debounceFilter(500) })

    return (
      <div>
        <button onClick={() => setCount(count + 1)}>increment</button>
        <button onClick={() => setUnrelated(unrelated + 1)}>bump-unrelated</button>
        <p>
          Count:
          {' '}
          {count}
        </p>
        <p>
          Unrelated:
          {' '}
          {unrelated}
        </p>
        <p>
          Updates:
          {' '}
          {updates}
        </p>
      </div>
    )
  }

  it('ignores unrelated re-renders and collapses rapid changes into one debounced update', async () => {
    const screen = await render(<UseWatchWithFilterDemo />)
    const increment = screen.getByRole('button', { name: 'increment' })

    await increment.click()
    await increment.click()
    // an unrelated state change re-renders but must not disturb the pending
    // debounce nor fire the callback (the watched source did not change)
    await screen.getByRole('button', { name: 'bump-unrelated' }).click()
    await increment.click()

    await expect.element(screen.getByText('Count: 3')).toBeVisible()
    await expect.element(screen.getByText('Unrelated: 1')).toBeVisible()
    // the burst is still pending in the debounce window — nothing fired yet
    await expect.element(screen.getByText('Updates: 0')).toBeVisible()
    // the trailing edge lands once the 500ms window elapses (advanced
    // explicitly — mirrors upstream index.test.ts)
    await vi.advanceTimersByTimeAsync(500)
    await expect.element(screen.getByText('Updates: 1')).toBeVisible()
  })
})
