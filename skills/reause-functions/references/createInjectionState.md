---
category: State
---

# createInjectionState

Create global state that can be injected into components.

## Usage

```tsx
// useCounterStore.ts
import { createInjectionState } from '@reause/shared'
import { useState } from 'react'

const [CounterStoreProvider, useCounterStore] = createInjectionState(({ initialValue }: { initialValue: number }) => {
  // state
  const [count, setCount] = useState(initialValue)

  // getters
  const double = count * 2

  // actions
  function increment() {
    setCount(current => current + 1)
  }

  return { count, double, increment }
})

export { CounterStoreProvider }

// If you want to hide `useCounterStore` and wrap it in default value logic or throw error logic, please don't export `useCounterStore`
export { useCounterStore }

export function useCounterStoreWithDefaultValue() {
  return useCounterStore() ?? {
    count: 0,
    double: 0,
    increment: () => {},
  }
}

export function useCounterStoreOrThrow() {
  const counterStore = useCounterStore()
  if (counterStore == null)
    throw new Error('Please render `<CounterStoreProvider>` on the appropriate parent component')
  return counterStore
}
```

```tsx
// RootComponent.tsx
import type { ReactNode } from 'react'
import { CounterStoreProvider } from './useCounterStore'

export function RootComponent({ children }: { children?: ReactNode }) {
  return (
    <CounterStoreProvider initialValue={0}>
      {children}
    </CounterStoreProvider>
  )
}
```

```tsx
// CountComponent.tsx
import { useCounterStore } from './useCounterStore'

export function CountComponent() {
  // use non-null assertion operator to ignore the case that store is not provided.
  const { count, double } = useCounterStore()!
  // if you want to allow component to working without providing store, you can use follow code instead:
  // const { count, double } = useCounterStore() ?? { count: 0, double: 0 }
  // also, you can use another hook to provide default value
  // const { count, double } = useCounterStoreWithDefaultValue()
  // or throw error
  // const { count, double } = useCounterStoreOrThrow()

  return (
    <ul>
      <li>{`count: ${count}`}</li>
      <li>{`double: ${double}`}</li>
    </ul>
  )
}
```

```tsx
// ButtonComponent.tsx
import { useCounterStore } from './useCounterStore'

export function ButtonComponent() {
  // use non-null assertion operator to ignore the case that store is not provided.
  const { increment } = useCounterStore()!

  return <button onClick={increment}>+</button>
}
```

## Provide a custom InjectionKey

```tsx
// useCounterStore.ts
import { createInjectionState } from '@reause/shared'
import { createContext, useState } from 'react'

// custom injectionKey
const CounterStoreKey = createContext<{ count: number, double: number, increment: () => void } | undefined>(undefined)

const [CounterStoreProvider, useCounterStore] = createInjectionState(({ initialValue }: { initialValue: number }) => {
  // state
  const [count, setCount] = useState(initialValue)

  // getters
  const double = count * 2

  // actions
  function increment() {
    setCount(current => current + 1)
  }

  return { count, double, increment }
}, { injectionKey: CounterStoreKey })
```

When a custom `injectionKey` is supplied, `defaultValue` is not used — the custom context's own default applies.

## Provide a custom default value

```tsx
// useCounterStore.ts
import { createInjectionState } from '@reause/shared'
import { useState } from 'react'

// useCounterStore does not return undefined when defaultValue is specified
const [CounterStoreProvider, useCounterStore] = createInjectionState(({ initialValue }: { initialValue: number }) => {
  // state
  const [count, setCount] = useState(initialValue)

  // getters
  const double = count * 2

  // actions
  function increment() {
    setCount(current => current + 1)
  }

  return { count, double, increment }
}, { defaultValue: { count: 0, double: 0, increment: () => {} } })
```

## Type Declarations

```ts
export interface CreateInjectionStateOptions<Return> {
  /**
   * Custom injectionKey for InjectionState — the React equivalent of upstream's string/symbol key.
   * React keys a context by object identity, so pass a `createContext(...)` instance; consumers may
   * then read it directly with `useContext`.
   */
  injectionKey?: Context<Return | undefined>
  /**
   * Default value used by `useInjectedState` when no provider is rendered above the consumer.
   * Implemented natively through `createContext`; when a custom `injectionKey` is supplied, that
   * context's own default is used instead.
   */
  defaultValue?: Return
}
export type CreateInjectionStateProvider<
  Props extends object,
  ProvideReturn = ReactNode,
> = (props: PropsWithChildren<Props>) => ProvideReturn
export type CreateInjectionStateReturn<
  Props extends object,
  ProvideReturn,
  InjectReturn,
> = Readonly<
  [
    /**
     * Render this component to create and provide the state to its descendants.
     */
    Provider: CreateInjectionStateProvider<Props, ProvideReturn>,
    /**
     * Call this hook in a consumer component to inject the state.
     */
    useInjectedState: () => InjectReturn,
  ]
>
/**
 * Map from @vueuse/shared `createInjectionState`.
 *
 * @see https://vueuse.org/createInjectionState
 *
 * @__NO_SIDE_EFFECTS__
 *
 * @example
 * const [CounterStoreProvider, useCounterStore] = createInjectionState(
 *   ({ initialValue }: { initialValue: number }) => {
 *     const [count, setCount] = useState(initialValue)
 *     return { count, inc: () => setCount(c => c + 1) }
 *   },
 * )
 *
 * function Counter() {
 *   const { count, inc } = useCounterStore()!
 *   return <button onClick={inc}>{count}</button>
 * }
 *
 * <CounterStoreProvider initialValue={0}>
 *   <Counter />
 * </CounterStoreProvider>
 */
export declare function createInjectionState<Props extends object, Return>(
  composable: (props: Props) => Return,
  options: {
    defaultValue: Return
  } & CreateInjectionStateOptions<Return>,
): CreateInjectionStateReturn<Props, ReactNode, Return>
export declare function createInjectionState<Props extends object, Return>(
  composable: (props: Props) => Return,
  options?: CreateInjectionStateOptions<Return>,
): CreateInjectionStateReturn<Props, ReactNode, Return | undefined>
```
