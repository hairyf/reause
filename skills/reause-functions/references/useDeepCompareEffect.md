---
category: Lifecycle
---

# useDeepCompareEffect

`useEffect` whose dependency comparison is **deep**.

## Usage

```tsx
import { useDeepCompareEffect } from '@reause/shared'
import { useState } from 'react'

function Demo() {
  const [count, setCount] = useState(0)
  // rebuilt on every render — a new reference, equal contents until `count` changes
  const options = { id: count, tags: ['a', 'b'] }

  useDeepCompareEffect(() => {
    // runs on mount and whenever `options` deep-changes — not on every re-render
    console.log('options changed', options)
    return () => console.log('cleanup')
  }, [options])

  return <button onClick={() => setCount(count + 1)}>increment</button>
}
```

## Type Declarations

```ts
/**
 * Map from react-use `useDeepCompareEffect` (upstream file `source/react-use/src/useDeepCompareEffect.ts`).
 *
 * @example
 * useDeepCompareEffect(() => {
 *   // `options` is rebuilt on every render; this runs only when it deep-changes
 *   return () => console.log('cleanup')
 * }, [options])
 */
export declare function useDeepCompareEffect(
  effect: EffectCallback,
  deps: DependencyList,
): void
```
