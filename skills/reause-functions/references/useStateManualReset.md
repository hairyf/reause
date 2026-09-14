---
category: Reactivity
---

# useStateManualReset

A state with manual reset functionality.

## Usage

```tsx
import { useStateManualReset } from '@reause/shared'

const [message, setMessage, resetMessage] = useStateManualReset('default message')

setMessage('message has set')

resetMessage()

console.log(message) // 'default message'
```

> [!NOTE]
> The input accepts `State<T>`: a plain value, getter, state tuple, or controlled
> `{ value, onChange }` object. `reset` re-reads the input on every call, so plain and getter
> sources reset to the latest source value; tuple / `{ value, onChange }` (controlled)
> sources carry no stored default, so they restore the initial argument value.

## Type Declarations

```ts
export type UseStateManualResetReturn<T> = [
  value: T,
  setValue: Dispatch<SetStateAction<T>>,
  reset: () => void,
]
/**
 * Map from @vueuse/shared `refManualReset`
 * (`source/vueuse/packages/shared/refManualReset/`).
 *
 * @example
 * const [message, setMessage, resetMessage] = useStateManualReset('default message')
 * setMessage('message has set')
 * resetMessage()
 * console.log(message) // 'default message'
 */
export declare function useStateManualReset<T>(
  value: State<T>,
): UseStateManualResetReturn<T>
```
