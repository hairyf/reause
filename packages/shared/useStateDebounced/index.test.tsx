import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, renderHook } from 'vitest-browser-react'
import { useStateDebounced } from '../useStateDebounced'

describe('useStateDebounced', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns the initial value immediately', async () => {
    const { result } = await renderHook(() => useStateDebounced('foo', 1000))

    expect(result.current[0]).toBe('foo')
    expect(result.current[2]).toBe('foo')
  })

  it('flips the debounced value only once the delay elapses after setValue', async () => {
    const { result, act } = await renderHook(() => useStateDebounced('foo', 1000))

    await act(() => result.current[1]('bar'))

    // the source flips immediately, the debounced value still holds 'foo'
    expect(result.current[0]).toBe('bar')
    expect(result.current[2]).toBe('foo')

    await act(async () => {
      vi.advanceTimersByTime(500)
    })
    expect(result.current[2]).toBe('foo')

    await act(async () => {
      vi.advanceTimersByTime(500)
    })
    expect(result.current[2]).toBe('bar')
  })

  it('supports functional setValue updates', async () => {
    const { result, act } = await renderHook(() => useStateDebounced(0, 100))

    await act(() => result.current[1](current => current + 1))
    await act(async () => {
      vi.advanceTimersByTime(100)
    })

    expect(result.current[0]).toBe(1)
    expect(result.current[2]).toBe(1)
  })

  it('collapses a burst of writes into a single trailing update with the latest value', async () => {
    const { result, act } = await renderHook(() => useStateDebounced('', 100))

    await act(() => result.current[1]('a'))
    await act(() => result.current[1]('b'))
    await act(() => result.current[1]('c'))
    expect(result.current[2]).toBe('')

    // writes keep re-scheduling the pending update, only 'c' is committed
    await act(async () => {
      vi.advanceTimersByTime(50)
    })
    expect(result.current[2]).toBe('')

    await act(async () => {
      vi.advanceTimersByTime(50)
    })
    expect(result.current[2]).toBe('c')
  })

  it('forces the update when maxWait elapses', async () => {
    const { result, act } = await renderHook(() => useStateDebounced('', 500, { maxWait: 1000 }))

    await act(() => result.current[1]('a'))
    await act(async () => {
      vi.advanceTimersByTime(300)
    })
    await act(() => result.current[1]('b'))
    await act(async () => {
      vi.advanceTimersByTime(300)
    })
    await act(() => result.current[1]('c'))

    // the regular timer was pushed to 1100ms, but the maxWait timer fires at 1000ms
    await act(async () => {
      vi.advanceTimersByTime(400)
    })
    expect(result.current[2]).toBe('c')
  })

  it('re-reads ms from the latest render on every write', async () => {
    const { result, act, rerender } = await renderHook(
      ({ ms }: { ms: number } = { ms: 100 }) => useStateDebounced('', ms),
      { initialProps: { ms: 100 } },
    )

    await act(() => result.current[1]('a'))
    await rerender({ ms: 300 })
    await act(async () => {
      result.current[1]('b')
    })

    // 'a' was superseded with the old delay — its timer was cleared; 'b' uses
    // the new 300ms delay (ms is a plain number, re-read on every write)
    await act(async () => {
      vi.advanceTimersByTime(100)
    })
    expect(result.current[2]).toBe('')

    await act(async () => {
      vi.advanceTimersByTime(200)
    })
    expect(result.current[2]).toBe('b')
  })

  it('supports a controlled state tuple source', async () => {
    let external = 0
    const setExternal = vi.fn((next: number | ((prev: number) => number)) => {
      external = typeof next === 'function' ? next(external) : next
    })
    const { result, rerender, act } = await renderHook(() => useStateDebounced([external, setExternal], 100))

    // writes route to the tuple setter
    await act(() => result.current[1](5))
    expect(setExternal).toHaveBeenCalledWith(5)

    // the parent applies the value; the debounced slot follows after the delay
    await rerender()
    expect(result.current[0]).toBe(5)
    expect(result.current[2]).toBe(0)

    await act(async () => {
      vi.advanceTimersByTime(100)
    })
    expect(result.current[2]).toBe(5)
  })

  it('supports a controlled { value, onChange } source', async () => {
    let external = 0
    const onChange = vi.fn((next: number) => {
      external = next
    })
    const { result, rerender, act } = await renderHook(() => useStateDebounced({ value: external, onChange }, 100))

    // writes route to onChange
    await act(() => result.current[1](7))
    expect(onChange).toHaveBeenCalledWith(7)

    await rerender()
    expect(result.current[0]).toBe(7)
    expect(result.current[2]).toBe(0)

    await act(async () => {
      vi.advanceTimersByTime(100)
    })
    expect(result.current[2]).toBe(7)
  })
})

describe('useStateDebounced (component)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function UseStateDebouncedDemo() {
    const [input, setInput, debounced] = useStateDebounced('', 500)

    return (
      <div>
        <button onClick={() => setInput(current => `${current}a`)}>Type a</button>
        <p>
          Input:
          {' '}
          {input}
        </p>
        <p>
          Debounced:
          {' '}
          {debounced}
        </p>
      </div>
    )
  }

  it('debounces a burst of edits into a single display update', async () => {
    const screen = await render(<UseStateDebouncedDemo />)
    const type = screen.getByRole('button', { name: 'Type a' })

    await type.click()
    await type.click()
    await type.click()

    await expect.element(screen.getByText('Input: aaa')).toBeVisible()

    // the 500ms debounce is faked — fire it explicitly instead of waiting a
    // real delay
    await vi.advanceTimersByTimeAsync(500)
    await expect.element(screen.getByText('Debounced: aaa')).toBeVisible()
  })
})
