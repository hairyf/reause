---
category: Reactivity
---

# useStateAutoReset

A controllable state which will be reset to the default value after some time.

## Usage

```tsx
import { useStateAutoReset } from '@reause/shared'

const [message, setMessage] = useStateAutoReset('default message', 1000)

function handleMessage() {
  // here the value will change to 'message has set' but after 1000ms, it will change to 'default message'
  setMessage('message has set')
}
```

> [!NOTE]
> You can reassign the entire object to trigger updates after making deep mutations to the inner value.

## Type Declarations

```ts
export type UseStateAutoResetReturn<T = any> = [T, Dispatch<SetStateAction<T>>]
/**
 * Map from @vueuse/shared `refAutoReset`
 * (`source/vueuse/packages/shared/refAutoReset/`).
 *
 * @param defaultValue The value which will be set.
 * @param afterMs      A zero-or-greater delay in milliseconds.
 * @example
 * const [message, setMessage] = useStateAutoReset('default message', 1000)
 *
 * function handleMessage() {
 *   setMessage('message has set') // resets to 'default message' after 1000ms
 * }
 */
export declare function useStateAutoReset<T = any>(
  defaultValue: State<T>,
  afterMs?: number,
): UseStateAutoResetReturn<T>
```
