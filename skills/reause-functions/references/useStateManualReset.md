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
 * React port of VueUse's `refManualReset`.
 *
 * Map from @vueuse/shared `refManualReset`
 * (`source/vueuse/packages/shared/refManualReset/`). Create a state with
 * manual reset functionality — any update can be reverted back to the initial
 * value with the returned `reset` function.
 *
 * Upstream returns a writable Vue `Ref<T>` extended with a `reset` method
 * (built on `customRef`). Per this repo's naming rules the port is renamed to
 * `useStateManualReset` and the ref becomes a `[value, setValue, reset]`
 * tuple: the second element is the plain `useState` setter (value or updater
 * form), and `reset` restores the default value.
 *
 * The state input accepts the shared `State<T>` form: a value, getter, ref-like
 * object, state tuple, or controlled `{ value, onChange }` object. `reset`
 * re-reads the input on every call, so plain, getter and ref-like sources
 * reset to the latest source value (matching upstream's
 * `value = toValue(defaultValue)`); tuple / `{ value, onChange }` (controlled)
 * sources have no stored default, so they restore the initial argument value.
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
