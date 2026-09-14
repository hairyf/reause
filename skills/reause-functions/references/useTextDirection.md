---
category: Browser
---

# useTextDirection

Reactive [dir](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/dir) of the element's text

## Usage

```tsx
import { useTextDirection } from '@reause/core'

const [dir, setDir] = useTextDirection() // ['ltr' | 'rtl' | 'auto', setter]
// <html dir="rtl"> → dir === 'rtl'
setDir('ltr') // writes dir="ltr" back to <html>
```

## Options

By default it targets the `<html>` tag. Pass a `selector` to target another element:

```tsx
const [mode, setMode] = useTextDirection({ selector: 'body' })
```

With `observe: true` the hook watches `document.querySelector(selector)` with a MutationObserver and
follows external `dir` changes:

```tsx
const [dir, setDir] = useTextDirection({ observe: true })
```

## Type Declarations

```ts
export type UseTextDirectionValue = "ltr" | "rtl" | "auto"
export interface UseTextDirectionOptions {
  /**
   * CSS selector for the target element applying to.
   *
   * @default 'html'
   */
  selector?: string
  /**
   * Observe `document.querySelector(selector)` changes using a MutationObserver.
   *
   * @default false
   */
  observe?: boolean
  /**
   * Initial value, also the SSR default — no `document` access happens during render.
   *
   * @default 'ltr'
   */
  initialValue?: UseTextDirectionValue
  /**
   * Specify a custom `document` instance, e.g. working with iframes or in testing environments.
   */
  document?: Document
}
export type UseTextDirectionReturn = [
  dir: UseTextDirectionValue,
  setDir: Dispatch<SetStateAction<UseTextDirectionValue>>,
]
/**
 * Map from @vueuse/core `useTextDirection`
 * (`source/vueuse/packages/core/useTextDirection/`).
 *
 * @example
 * const [dir, setDir] = useTextDirection()
 * // <html dir="rtl"> → dir === 'rtl'
 * setDir('ltr') // writes dir="ltr" back to <html>
 */
export declare function useTextDirection(
  options?: UseTextDirectionOptions,
): UseTextDirectionReturn
```
