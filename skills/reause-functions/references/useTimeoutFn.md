---
category: Animation
---

# useTimeoutFn

Wrapper for `setTimeout` with controls

## Usage

```tsx
import { useTimeoutFn } from '@reause/shared'

const { isPending, start, stop } = useTimeoutFn(() => {
  /* ... */
}, 3000)
```

## Type Declarations

```ts
type AnyFn = (...args: any[]) => any
export interface UseTimeoutFnOptions {
  /**
   * Start the timer immediately
   *
   * @default true
   */
  immediate?: boolean
  /**
   * Execute the callback immediately after calling `start`
   *
   * @default false
   */
  immediateCallback?: boolean
}
export interface UseTimeoutFnReturn<CallbackFn extends AnyFn> {
  isPending: boolean
  stop: () => void
  start: (...args: Parameters<CallbackFn> | []) => void
}
/**
 * React port of VueUse's `useTimeoutFn` — wrapper for `setTimeout` with
 * controls.
 *
 * Map from @vueuse/shared `useTimeoutFn`
 * Mapping: upstream accepts `MaybeRefOrGetter<number>` for the interval — this
 * port accepts a plain `number`. `isPending` becomes a boolean state
 * (upstream: a readonly shallow ref) that starts `false` and is set inside
 * the mount effect — like upstream's `shallowRef(false)` + `isClient` gate,
 * the server render does not report pending. `immediateCallback` runs the
 * callback synchronously on `start` (before the timer is armed). The timer
 * is scheduled in a mount effect (upstream starts synchronously during
 * setup) and a pending timer is cleared on unmount via effect cleanup. The
 * latest callback and interval are kept in refs so restarts always use the
 * newest ones.
 *
 * @example
 * const { isPending, start, stop } = useTimeoutFn(() => { ... }, 3000)
 */
export declare function useTimeoutFn<CallbackFn extends AnyFn>(
  cb: CallbackFn,
  interval: number,
  options?: UseTimeoutFnOptions,
): UseTimeoutFnReturn<CallbackFn>
```
