import { describe, expect, it, vi } from 'vitest'
import { render, renderHook } from 'vitest-browser-react'
import { createGlobalState } from '../createGlobalState'

describe('createGlobalState', () => {
  it('is defined', () => {
    expect(createGlobalState).toBeTypeOf('function')
  })

  it('updates both components (upstream: both components should be updated)', async () => {
    const useGlobalValue = createGlobalState(0)
    const first = await renderHook(() => useGlobalValue())
    const second = await renderHook(() => useGlobalValue())

    expect(first.result.current[0]).toBe(0)
    expect(second.result.current[0]).toBe(0)

    await first.act(() => first.result.current[1](1))

    expect(first.result.current[0]).toBe(1)
    expect(second.result.current[0]).toBe(1)
  })

  it('shares one module-wide state and updates every consumer', async () => {
    // the rendered twin of the test above: a write from one consumer is
    // observed by the other one, and the other way round
    const useGlobalState = createGlobalState(() => 0)

    function Consumer({ label }: { label: string }) {
      const [count, setCount] = useGlobalState()

      return (
        <div>
          <span>{`${label}: ${count}`}</span>
          <button onClick={() => setCount(prev => prev + 1)}>{`inc-${label}`}</button>
        </div>
      )
    }

    const screen = await render(
      <div>
        <Consumer label="a" />
        <Consumer label="b" />
      </div>,
    )

    await expect.element(screen.getByText('a: 0')).toBeVisible()
    await expect.element(screen.getByText('b: 0')).toBeVisible()

    await screen.getByRole('button', { name: 'inc-a' }).click()
    await expect.element(screen.getByText('a: 1')).toBeVisible()
    await expect.element(screen.getByText('b: 1')).toBeVisible()

    await screen.getByRole('button', { name: 'inc-b' }).click()
    await expect.element(screen.getByText('a: 2')).toBeVisible()
    await expect.element(screen.getByText('b: 2')).toBeVisible()
  })

  it('allows setting state with a function and the previous value', async () => {
    const useGlobalValue = createGlobalState(0)
    const first = await renderHook(() => useGlobalValue())
    const second = await renderHook(() => useGlobalValue())

    await first.act(() => first.result.current[1](value => value + 1))

    expect(first.result.current[0]).toBe(1)
    expect(second.result.current[0]).toBe(1)
  })

  it('allows setting state with a function and no previous value', async () => {
    const useGlobalValue = createGlobalState(0)
    const first = await renderHook(() => useGlobalValue())
    const second = await renderHook(() => useGlobalValue())

    await first.act(() => first.result.current[1](() => 1))

    expect(first.result.current[0]).toBe(1)
    expect(second.result.current[0]).toBe(1)
  })

  it('calls a zero-argument action with no arguments (resolveHookState arity rule)', async () => {
    const useGlobalValue = createGlobalState(0)
    const { result, act } = await renderHook(() => useGlobalValue())
    const factory = vi.fn(() => 5)

    await act(() => result.current[1](factory))

    // upstream's `resolveHookState`: `nextState.length ? nextState(currentState) : nextState()`
    expect(factory.mock.calls).toEqual([[]])
    expect(result.current[0]).toBe(5)
  })

  it('accepts a plain initial value and the functional updater form', async () => {
    const useGlobalState = createGlobalState({ count: 0 })
    const { result, act } = await renderHook(() => useGlobalState())

    expect(result.current[0]).toEqual({ count: 0 })

    await act(() => result.current[1]({ count: 5 }))
    expect(result.current[0]).toEqual({ count: 5 })

    await act(() => result.current[1](prev => ({ count: prev.count * 2 })))
    expect(result.current[0]).toEqual({ count: 10 })
  })

  it('initializes with a function, resolved exactly once at createGlobalState time', async () => {
    const init = vi.fn(() => 5)
    const useGlobalValue = createGlobalState(init)

    // resolved eagerly, when `createGlobalState` is called (module scope) —
    // upstream resolves `initialState instanceof Function ? initialState() : initialState`
    expect(init).toHaveBeenCalledTimes(1)

    const first = await renderHook(() => useGlobalValue())
    const second = await renderHook(() => useGlobalValue())

    // hook calls never re-run the initializer
    expect(init).toHaveBeenCalledTimes(1)
    expect(first.result.current[0]).toBe(5)
    expect(second.result.current[0]).toBe(5)
  })

  it('initializes and updates with undefined', async () => {
    const useGlobalValue = createGlobalState<number>()
    const first = await renderHook(() => useGlobalValue())
    const second = await renderHook(() => useGlobalValue())

    expect(first.result.current[0]).toBeUndefined()
    expect(second.result.current[0]).toBeUndefined()

    await first.act(() => first.result.current[1](value => value))

    expect(first.result.current[0]).toBeUndefined()
    expect(second.result.current[0]).toBeUndefined()
  })

  it('initializes with undefined and updates with a different type', async () => {
    const useGlobalValue = createGlobalState()
    const { result, act } = await renderHook(() => useGlobalValue())

    expect(result.current[0]).toBeUndefined()

    // @ts-expect-error the state is `undefined`, so an updater returning a number is a type error
    await act(() => result.current[1](() => 1))

    expect(result.current[0]).toBe(1)
  })

  it('starts with undefined when called without arguments, and stays writable', async () => {
    const useGlobalState = createGlobalState<undefined | string>()
    const first = await renderHook(() => useGlobalState())

    expect(first.result.current[0]).toBeUndefined()

    await first.act(() => first.result.current[1]('now-defined'))
    expect(first.result.current[0]).toBe('now-defined')
  })

  it('keeps the state after unmount (upstream: should work after dispose)', async () => {
    const useGlobalState = createGlobalState(() => 1)

    function Counter() {
      const [count, setCount] = useGlobalState()

      return <button onClick={() => setCount(prev => prev + 1)}>{`count: ${count}`}</button>
    }

    const first = await render(<Counter />)
    await first.getByRole('button', { name: 'count: 1' }).click()
    await expect.element(first.getByRole('button', { name: 'count: 2' })).toBeVisible()

    // the store outlives the component — nothing is reset or disposed
    await first.unmount()

    const second = await render(<Counter />)
    await expect.element(second.getByRole('button', { name: 'count: 2' })).toBeVisible()

    await second.getByRole('button', { name: 'count: 2' }).click()
    await expect.element(second.getByRole('button', { name: 'count: 3' })).toBeVisible()
  })

  it('survives unmount and remount for a hook consumer', async () => {
    const useGlobalState = createGlobalState(() => 'initial')

    const first = await renderHook(() => useGlobalState())
    expect(first.result.current[0]).toBe('initial')

    await first.act(() => first.result.current[1]('updated'))
    expect(first.result.current[0]).toBe('updated')

    await first.unmount()

    const second = await renderHook(() => useGlobalState())
    expect(second.result.current[0]).toBe('updated')
  })

  it('returns a stable tuple per state and a setter shared across renders and consumers', async () => {
    const useGlobalState = createGlobalState(() => 0)
    const { result, act, rerender } = await renderHook(() => useGlobalState())
    const second = await renderHook(() => useGlobalState())

    const tuple = result.current
    const setState = result.current[1]

    await rerender()
    // memoized on the snapshot: the tuple does not churn while the state holds
    expect(result.current).toBe(tuple)

    await act(() => result.current[1](1))

    expect(result.current[0]).toBe(1)
    expect(result.current).not.toBe(tuple)
    expect(result.current[1]).toBe(setState)
    // upstream shares one `store.setState` across every consumer
    expect(second.result.current[1]).toBe(setState)
  })
})
