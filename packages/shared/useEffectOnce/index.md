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
