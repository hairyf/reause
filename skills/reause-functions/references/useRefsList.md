---
category: Component
---

# useRefsList

Shorthand for binding refs to elements rendered inside a list

## Usage

```tsx
import { useRefsList } from '@reause/core'

function List({ items }: { items: string[] }) {
  const refs = useRefsList<HTMLLIElement>()

  return (
    <ul>
      {items.map(item => (
        <li key={item} ref={el => refs.set(el)}>
          {item}
        </li>
      ))}
    </ul>
  )
}
```

## Type Declarations

```ts
/**
 * A list of collected refs with an attached `set(el)` collector callback — the React counterpart of
 * upstream's `TemplateRefsList<T> = T[] & { set }`.
 */
export type TemplateRefsList<T> = T[] & {
  set: (el: T | null) => void
}
/**
 * Map from @vueuse/core `useTemplateRefsList`
 * (`source/vueuse/packages/core/useTemplateRefsList/`).
 *
 * @__NO_SIDE_EFFECTS__
 * @example
 * const refs = useRefsList<HTMLLIElement>()
 *
 * items.map((item) => (
 *   <li key={item} ref={el => refs.set(el)}>{item}</li>
 * ))
 *
 * refs.length // number of currently mounted `<li>` elements (after commit)
 * refs[0] // first `<li>` element
 */
export declare function useRefsList<T = Element>(): TemplateRefsList<T>
```
