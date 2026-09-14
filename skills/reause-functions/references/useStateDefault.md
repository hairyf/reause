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

## Value sources

`source` accepts a `State<T | undefined | null>`: a plain value, a getter, a
`[value, setter]` tuple or a `{ value, onChange }` pair. `setValue` accepts a
value or an updater function (`current => ...`),
writes through to the tuple setter or `onChange`, and
re-renders the derived value; a plain value / getter source stays read-only
(calls are a no-op — there is no channel to write back to the source).

> **Caveat** — the source contract is `T | undefined | null`, so a
> `[value, setter]` / `{ value, onChange }` source must be typed accordingly
> (e.g. `useState<T | null | undefined>`), because the setter has to accept
> `null` as well.

## Type Declarations

```ts
export type UseStateDefaultReturn<T = any> = [
  /**
   * Current value — the source's current value, or `defaultValue` when the
   * source is `null`/`undefined`.
   */
  value: T,
  /**
   * Setter to update the value (value or updater form, like `setState`) —
   * writes through to a state tuple's setter or a `{ value, onChange }`
   * source's `onChange`.
   */
  setValue: Dispatch<SetStateAction<T | undefined | null>>,
]
/**
 * Apply default value to a state source — React port of VueUse's
 * `refDefault` renamed to `useStateDefault` (this repo's naming for the
 * `ref*` family; upstream's single writable computed ref becomes a tuple).
 *
 * Map from @vueuse/shared `refDefault`
 * Mapping: upstream derives a writable `computed` from a source
 * `Ref<T | undefined | null>` — it reads `source.value ?? defaultValue` and
 * writes back to `source.value`. This port accepts a `State<T | undefined |
 * null>` — a plain value, a getter, a `[value, setter]` tuple or a
 * `{ value, onChange }` pair — and returns the React tuple
 * `const [value, setValue] = useStateDefault(raw, 'default')`. `value` is
 * derived on every render from the source through `toValue`
 * (`source ?? defaultValue`), so it always reflects the source's current
 * value — including writes made from outside the component; `setValue`
 * resolves the next value (value or updater form), writes it through to the
 * source (its setter or its `onChange`) and bumps a local version counter
 * so the derived `value` re-renders. SSR-safe: nothing touches the DOM and the
 * first server render already shows the default.
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
