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
 * Map from @vueuse/shared `useTimeoutFn`.
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
