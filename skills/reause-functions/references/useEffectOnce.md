---
category: Lifecycle
---

# useEffectOnce

Runs an effect once after the component mounts, and forwards the cleanup that effect returns — React port of react-use's `useEffectOnce`, mapped from the upstream file `source/react-use/src/useEffectOnce.ts` (its upstream documentation page is `source/react-use/docs/useEffectOnce.md`). The implementation mirrors upstream verbatim: it is exactly equivalent to `useEffect(fn, [])`.

Do not confuse it with `useMount`, the neighbouring react-use port: `useMount(fn: () => void): void` takes a bare callback and **drops whatever it returns**, while `useEffectOnce(effect: EffectCallback): void` keeps upstream's `EffectCallback` signature so the returned cleanup is registered with React and runs on unmount.

## Usage

```tsx
import { useEffectOnce } from '@reause/shared'

useEffectOnce(() => {
  const subscription = source.subscribe()

  // forwarded to React by `useEffectOnce`: runs on unmount
  return () => subscription.unsubscribe()
})
```

## Type Declarations

```ts
/**
 * React port of react-use's `useEffectOnce`.
 *
 * Map from react-use `useEffectOnce` (upstream file
 * `source/react-use/src/useEffectOnce.ts`): the whole implementation is
 * `useEffect(effect, [])`, mirrored verbatim — no ref, no first-mount flag, no
 * extra guard. Equivalent to `useEffect(fn, [])`.
 *
 * Mapping: the signature stays exactly upstream's
 * `useEffectOnce(effect: EffectCallback): void`, **not** `(fn: () => void)`,
 * because the return value is the reason this hook exists next to `useMount`:
 * the cleanup the effect returns is forwarded to React, which calls it on
 * unmount. `useMount` takes a bare `() => void` and drops whatever it returns.
 *
 * Upstream ships this hook as a default export; reause exposes it as a named
 * export (repo convention) with the same function and signature.
 *
 * @example
 * useEffectOnce(() => {
 *   const subscription = source.subscribe()
 *   return () => subscription.unsubscribe()
 * })
 */
export declare function useEffectOnce(effect: EffectCallback): void
```
