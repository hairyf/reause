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
