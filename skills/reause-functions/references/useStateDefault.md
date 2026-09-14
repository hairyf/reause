---
category: Reactivity
---

# useStateDefault

Apply default value to a ref

## Usage

```tsx
import { useStateDefault } from '@reause/shared'

const raw = { current: undefined as string | undefined }
const [value, setValue] = useStateDefault(raw, 'default')

setValue('hello')
// the derived value updates on the next render (React derives it at render)
console.log(value) // 'hello' after the next render
console.log(raw.current) // 'hello' (written through immediately)

setValue(undefined)
console.log(value) // 'default' after the next render

raw.current = 'from outside' // external control — picked up on the next render
```

## Type Declarations

```ts
export type UseStateDefaultReturn<T = any> = [
  /**
   * Current value — the source's current value, or `defaultValue` when the source is
   * `null`/`undefined`.
   */
  value: T,
  /**
   * Setter to update the value (value or updater form, like `setState`) — writes through to a state
   * tuple's setter or a `{ value, onChange }` source's `onChange`.
   */
  setValue: Dispatch<SetStateAction<T | undefined | null>>,
]
/**
 * Map from @vueuse/shared `refDefault`.
 *
 * @param source       The `State<T | undefined | null>` source holding the
 *                     value — read through `toValue` on every render and
 *                     written back to the tuple setter / `onChange` on
 *                     `setValue`.
 * @param defaultValue The value displayed while the source is `null` or
 *                     `undefined`.
 * @return  A tuple `[value, setValue]` — the current value (source value or
 *          `defaultValue`) and its setter.
 *
 * @example
 * const [raw, setRaw] = useState<string | undefined>(undefined)
 * const [value, setValue] = useStateDefault([raw, setRaw], 'default')
 *
 * setValue('hello')
 * console.log(value) // 'hello' after the next render (React derives at render)
 *
 * setValue(undefined)
 * console.log(value) // 'default' after the next render
 */
export declare function useStateDefault<T = any>(
  source: State<T | undefined | null>,
  defaultValue: T,
): UseStateDefaultReturn<T>
```
