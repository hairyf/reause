import { describe, expect, it, vi } from 'vitest'
import { render, renderHook } from 'vitest-browser-react'
import { useStateWithControl } from '../useStateWithControl'

describe('useStateWithControl', () => {
  it('should be defined', () => {
    expect(useStateWithControl).toBeDefined()
  })

  it('returns the [value, setValue, control] tuple', async () => {
    const { result } = await renderHook(() => useStateWithControl(0))

    const [value, setValue, control] = result.current
    expect(value).toBe(0)
    expect(typeof setValue).toBe('function')
    expect(control).toBeTypeOf('object')
    expect(typeof control.get).toBe('function')
    expect(typeof control.set).toBe('function')
    expect(typeof control.untrackedGet).toBe('function')
    expect(typeof control.silentSet).toBe('function')
    expect(typeof control.peek).toBe('function')
    expect(typeof control.lay).toBe('function')
    expect(typeof control.reset).toBe('function')
  })

  it('acts like a normal state pair', async () => {
    const { result, act } = await renderHook(() => useStateWithControl(0))

    expect(result.current[0]).toBe(0)

    await act(async () => {
      result.current[1](1)
    })
    expect(result.current[0]).toBe(1)

    await act(async () => {
      result.current[1](10)
    })
    expect(result.current[0]).toBe(10)
  })

  it('setValue accepts an updater function', async () => {
    const { result, act } = await renderHook(() => useStateWithControl(0))

    await act(async () => {
      result.current[1](count => count + 1)
    })
    expect(result.current[0]).toBe(1)
  })

  it('accepts State sources including controlled tuples', async () => {
    const { result } = await renderHook(() => useStateWithControl(42))
    expect(result.current[0]).toBe(42)

    const { result: getter } = await renderHook(() => useStateWithControl(() => 42))
    expect(getter.current[0]).toBe(42)

    // a `{ value, onChange }` pair is the object form of a State source — a
    // ref (`{ current }`) is no longer one (refs are DOM handles)
    const onPairChange = vi.fn()
    const { result: pair, act: pairAct } = await renderHook(() => useStateWithControl({ value: 42, onChange: onPairChange }))
    expect(pair.current[0]).toBe(42)
    await pairAct(async () => pair.current[1](43))
    expect(onPairChange).toHaveBeenCalledWith(43)

    const onChange = vi.fn()
    const { result: controlled, act } = await renderHook(() => useStateWithControl([42, onChange]))
    expect(controlled.current[0]).toBe(42)
    await act(async () => controlled.current[1](43))
    expect(onChange).toHaveBeenCalledWith(43)
  })

  it('should be able to set without triggering a re-render', async () => {
    const onChanged = vi.fn()
    const { result, act } = await renderHook(() => useStateWithControl<number>(0, { onChanged }))

    // `lay` / `silentSet` update the value without re-rendering the component
    await act(async () => {
      result.current[2].lay(42)
    })
    expect(onChanged).toHaveBeenCalledWith(42, 0)
    expect(result.current[0]).toBe(0)
    expect(result.current[2].get()).toBe(42)

    // setting the same value is a no-op
    await act(async () => {
      result.current[2].silentSet(42)
    })
    expect(onChanged).toHaveBeenCalledTimes(1)

    // a triggering set flushes the internal value through a re-render
    await act(async () => {
      result.current[2].set(10)
    })
    expect(result.current[0]).toBe(10)
    expect(onChanged).toHaveBeenCalledWith(10, 42)
  })

  it('should be able to set with the untracked/silent shorthands', async () => {
    const { result, act } = await renderHook(() => useStateWithControl(0))

    result.current[2].silentSet(1)
    result.current[2].lay(2)
    expect(result.current[2].get()).toBe(2)
    expect(result.current[0]).toBe(0)

    // the internal value is what a subsequent updater sees
    await act(async () => {
      result.current[1](count => count + 1)
    })
    expect(result.current[0]).toBe(3)
  })

  it('should be able to get the value with get / peek / untrackedGet', async () => {
    const { result, act } = await renderHook(() => useStateWithControl(0))

    expect(result.current[2].get()).toBe(0)
    expect(result.current[2].get(false)).toBe(0)
    expect(result.current[2].peek()).toBe(0)
    expect(result.current[2].untrackedGet()).toBe(0)

    await act(async () => {
      result.current[2].set(10)
    })
    expect(result.current[2].get()).toBe(10)
    expect(result.current[2].peek()).toBe(10)
    expect(result.current[2].untrackedGet()).toBe(10)
    expect(result.current[0]).toBe(10)
  })

  it('keeps silent writes for controlled sources across re-renders', async () => {
    const setter = vi.fn()
    const { result, act, rerender } = await renderHook(() => useStateWithControl([5, setter]))

    expect(result.current[0]).toBe(5)

    // a silent write updates the internal value without touching the parent
    await act(async () => {
      result.current[2].lay(30)
    })
    expect(result.current[2].get()).toBe(30)
    expect(result.current[0]).toBe(5)
    expect(setter).not.toHaveBeenCalled()

    // an unrelated re-render must not revert the silent write back to the
    // rendered value (the parent still presents 5)
    await rerender()
    expect(result.current[2].get()).toBe(30)
    expect(result.current[0]).toBe(5)

    // a triggering write supersedes it through the tuple setter
    await act(async () => {
      result.current[1](7)
    })
    expect(setter).toHaveBeenCalledWith(7)
    expect(result.current[2].get()).toBe(7)
  })

  it('should be able to dismiss changes', async () => {
    const onChanged = vi.fn()
    let dismissed = 0
    const { result, act } = await renderHook(() => useStateWithControl<number>(0, {
      onBeforeChange(value, oldValue) {
        // disallow changes larger than ±5 in one operation
        if (Math.abs(value - oldValue) > 5) {
          dismissed += 1
          return false
        }
      },
      onChanged,
    }))

    await act(async () => {
      result.current[1](current => current + 1)
    })
    expect(result.current[0]).toBe(1)
    expect(dismissed).toBe(0)
    expect(onChanged).toHaveBeenCalledWith(1, 0)

    await act(async () => {
      result.current[1](current => current + 6)
    })
    expect(result.current[0]).toBe(1)
    expect(dismissed).toBe(1)
    expect(onChanged).toHaveBeenCalledTimes(1)

    await act(async () => {
      result.current[1](current => current - 5)
    })
    expect(result.current[0]).toBe(-4)
    expect(dismissed).toBe(1)
    expect(onChanged).toHaveBeenCalledWith(-4, 1)
    expect(onChanged).toHaveBeenCalledTimes(2)
  })

  it('control.reset() restores the initial value', async () => {
    const { result, act } = await renderHook(() => useStateWithControl(0))

    await act(async () => {
      result.current[2].set(10)
    })
    expect(result.current[0]).toBe(10)

    await act(async () => {
      result.current[2].reset()
    })
    expect(result.current[0]).toBe(0)
    expect(result.current[2].get()).toBe(0)

    // reset works even after silent sets (internal value readonly via control)
    await act(async () => {
      result.current[2].lay(20)
    })
    await act(async () => {
      result.current[2].reset()
    })
    expect(result.current[0]).toBe(0)
    expect(result.current[2].get()).toBe(0)
  })
})

describe('useStateWithControl (component)', () => {
  function UseStateWithControlDemo() {
    const [num, setNum, control] = useStateWithControl(0)

    return (
      <div>
        <button onClick={() => setNum(current => current + 1)}>Increment</button>
        <button onClick={() => control.set(10)}>Set 10</button>
        <button onClick={() => control.silentSet(20)}>Silent 20</button>
        <button onClick={() => control.reset()}>Reset</button>
        <p>
          Value:
          {' '}
          {num}
        </p>
      </div>
    )
  }

  it('re-renders on triggering sets and reset, but not on silent sets', async () => {
    const screen = await render(<UseStateWithControlDemo />)

    const increment = screen.getByRole('button', { name: 'Increment' })
    const set10 = screen.getByRole('button', { name: 'Set 10' })
    const silent20 = screen.getByRole('button', { name: 'Silent 20' })
    const reset = screen.getByRole('button', { name: 'Reset' })

    await expect.element(screen.getByText('Value: 0')).toBeVisible()

    await increment.click()
    await expect.element(screen.getByText('Value: 1')).toBeVisible()

    await set10.click()
    await expect.element(screen.getByText('Value: 10')).toBeVisible()

    // a silent set updates the internal value without re-rendering
    await silent20.click()
    await expect.element(screen.getByText('Value: 10')).toBeVisible()

    // the next triggering change flushes the internal value through
    await increment.click()
    await expect.element(screen.getByText('Value: 21')).toBeVisible()

    await reset.click()
    await expect.element(screen.getByText('Value: 0')).toBeVisible()
  })
})
