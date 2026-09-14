---
category: State
---

# createScopedHook

Create global state that can be injected into components.

## Usage

```tsx
// useCounterStore.ts
import { createScopedHook } from '@reause/shared'
import { useState } from 'react'

const [CounterStoreProvider, useCounterStore] = createScopedHook(({ initialValue }: { initialValue: number }) => {
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
import { createScopedHook } from '@reause/shared'
import { createContext, useState } from 'react'

// custom injectionKey
const CounterStoreKey = createContext<{ count: number, double: number, increment: () => void } | undefined>(undefined)

const [CounterStoreProvider, useCounterStore] = createScopedHook(({ initialValue }: { initialValue: number }) => {
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
import { createScopedHook } from '@reause/shared'
import { useState } from 'react'

// useCounterStore does not return undefined when defaultValue is specified
const [CounterStoreProvider, useCounterStore] = createScopedHook(({ initialValue }: { initialValue: number }) => {
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
