---
category: Lifecycle
---

# useDeepCompareEffect

`useEffect` whose dependency comparison is **deep** — the effect re-runs only when `deps` differ structurally, so an options object rebuilt on every render stays inert. React port of react-use's `useDeepCompareEffect`, whose upstream implementation lives in `source/react-use/src/useDeepCompareEffect.ts` and delegates to `source/react-use/src/useCustomCompareEffect.ts` with the `isDeepEqual` re-exported by `source/react-use/src/misc/isDeepEqual.ts`. This port inlines that custom-compare primitive instead of exposing a second public hook: a `useRef<DependencyList>` holds the last deps array the effect ran with, `deepEqual` decides whether the current render's deps replace it, and `useEffect(effect, ref.current)` receives the stored array — React's own element-wise comparison then skips the effect whenever the deps are deep-equal. The comparison reuses `@reause/shared`'s existing `deepEqual`, so no `fast-deep-equal` dependency is added.

`deps` is **required**, exactly as upstream. Outside production the hook also warns through `console.warn` when `deps` is empty and when every dep is a primitive value — both are cases where a plain `useEffect` is what the caller wants — while still behaving normally. It is not `useWatchDeep` (VueUse): that watches a reactive value and reports changes to a callback, whereas this only decides whether a React effect may re-run and never calls a callback itself. Use `useWatchDeep` to react to a value, and this hook to key an effect on one.

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
