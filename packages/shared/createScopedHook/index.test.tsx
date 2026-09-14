import { createContext, useContext, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { createScopedHook } from '.'

describe('createScopedHook', () => {
  it('is defined', () => {
    expect(createScopedHook).toBeTypeOf('function')
  })

  it('should work for simple nested component', async () => {
    const [CounterStoreProvider, useCounterStore] = createScopedHook(
      ({ initialValue }: { initialValue: number }) => {
        const [count, setCount] = useState(initialValue)
        return { count, setCount }
      },
    )

    function Child() {
      const store = useCounterStore()!
      return <span>{`Count is ${store.count}`}</span>
    }

    const screen = await render(
      <CounterStoreProvider initialValue={114514}>
        <Child />
      </CounterStoreProvider>,
    )

    await expect.element(screen.getByText('Count is 114514')).toBeVisible()
  })

  it('should have useInjectedState return default value when not providing state', async () => {
    const [, useCounterStore] = createScopedHook(
      ({ initialValue }: { initialValue: number }) => initialValue,
      { defaultValue: 543742 },
    )

    function Consumer() {
      return <span>{`Count is ${useCounterStore()}`}</span>
    }

    const screen = await render(<Consumer />)

    await expect.element(screen.getByText('Count is 543742')).toBeVisible()
  })

  it('should work for custom injectionKey', async () => {
    const CounterStoreKey = createContext<number | undefined>(undefined)

    const [CounterStoreProvider, useCounterStore] = createScopedHook(
      ({ initialValue }: { initialValue: number }) => initialValue,
      { injectionKey: CounterStoreKey },
    )

    function Consumer() {
      return (
        <div>
          <span>{`Count is ${useCounterStore()}`}</span>
          <span>{`Injected is ${useContext(CounterStoreKey)}`}</span>
        </div>
      )
    }

    const screen = await render(
      <CounterStoreProvider initialValue={0}>
        <Consumer />
      </CounterStoreProvider>,
    )

    await expect.element(screen.getByText('Count is 0')).toBeVisible()
    await expect.element(screen.getByText('Injected is 0')).toBeVisible()
  })

  it('should return undefined when neither a provider nor a defaultValue exists', async () => {
    const [, useCounterStore] = createScopedHook(() => 663512)

    let injected: number | undefined = 0

    function Consumer() {
      injected = useCounterStore()
      return <span>Consumer</span>
    }

    const screen = await render(<Consumer />)

    await expect.element(screen.getByText('Consumer')).toBeVisible()
    expect(injected).toBeUndefined()
  })

  it('should let an inner provider override the outer one for its own subtree', async () => {
    const [CounterStoreProvider, useCounterStore] = createScopedHook(
      ({ initialValue }: { initialValue: number }) => initialValue,
    )

    function Consumer() {
      return <span>{`Count is ${useCounterStore()}`}</span>
    }

    const screen = await render(
      <CounterStoreProvider initialValue={1}>
        <Consumer />
        <CounterStoreProvider initialValue={2}>
          <Consumer />
        </CounterStoreProvider>
      </CounterStoreProvider>,
    )

    await expect.element(screen.getByText('Count is 1')).toBeVisible()
    await expect.element(screen.getByText('Count is 2')).toBeVisible()
  })

  it('should re-render consumers when the provided state changes', async () => {
    const [CounterStoreProvider, useCounterStore] = createScopedHook(
      ({ initialValue }: { initialValue: number }) => {
        const [count, setCount] = useState(initialValue)
        return { count, inc: () => setCount(current => current + 1) }
      },
    )

    function Consumer() {
      const { count, inc } = useCounterStore()!
      return (
        <div>
          <span>{`Count is ${count}`}</span>
          <button onClick={inc}>Increment</button>
        </div>
      )
    }

    const screen = await render(
      <CounterStoreProvider initialValue={0}>
        <Consumer />
      </CounterStoreProvider>,
    )

    await expect.element(screen.getByText('Count is 0')).toBeVisible()

    await screen.getByRole('button', { name: 'Increment' }).click()

    await expect.element(screen.getByText('Count is 1')).toBeVisible()
  })

  it('should pass exactly the provider props (without children) to the factory, and only on render', async () => {
    const factory = vi.fn((props: { initialValue: number }) => props.initialValue)
    const [CounterStoreProvider] = createScopedHook(factory)

    expect(factory).not.toHaveBeenCalled()

    const screen = await render(
      <CounterStoreProvider initialValue={7}>
        <span>Child</span>
      </CounterStoreProvider>,
    )

    await expect.element(screen.getByText('Child')).toBeVisible()

    expect(factory).toHaveBeenCalledTimes(1)
    expect(factory).toHaveBeenCalledWith({ initialValue: 7 })
  })

  it('should name the provider component after the factory', () => {
    function useCounterStore({ initialValue }: { initialValue: number }) {
      return initialValue
    }

    const [CounterStoreProvider] = createScopedHook(useCounterStore)
    const [AnonymousProvider] = createScopedHook(() => 0)

    expect((CounterStoreProvider as { displayName?: string }).displayName).toBe('useCounterStoreProvider')
    expect((AnonymousProvider as { displayName?: string }).displayName).toBe('InjectionStateProvider')
  })
})
