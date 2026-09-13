---
category: Lifecycle
---

# useMount

Runs a callback once after the component mounts — React port of react-use's `useMount`.

## Usage

```tsx
import { useMount } from '@reause/shared'

useMount(() => {
  console.log('mounted')
})
```

## Type Declarations

```ts
/**
 * React port of react-use's `useMount`.
 *
 * Map from react-use `useMount`.
 * Runs `fn` exactly once after the component mounts.
 *
 * Unlike `useEffectOnce` — the neighbouring react-use port, which keeps
 * upstream's `(effect: EffectCallback): void` signature — `fn` is a bare
 * `() => void`, so nothing it returns is registered with React: the cleanup a
 * mount-time effect could hand back is dropped here. Use `useEffectOnce` when
 * that cleanup must run on unmount.
 *
 * @example
 * useMount(() => {
 *   trackPageView()
 * })
 */
export declare function useMount(fn: () => void): void
```
