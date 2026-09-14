---
category: Browser
---

# useUrlSearchParams

Reactive [URLSearchParams](https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams)

## Usage

```tsx
import { useUrlSearchParams } from '@reause/core'

const [params, setParams] = useUrlSearchParams('history')

console.log(params.foo) // 'bar'

setParams({ ...params, foo: 'bar' })
// url updated to `?foo=bar`

setParams((prev) => {
  const next = { ...prev }
  delete next.foo
  return next
})
// url updated to remove `foo`
```

### Hash Mode

When using with hash mode route, specify the `mode` to `hash`

```tsx
import { useUrlSearchParams } from '@reause/core'

const [params, setParams] = useUrlSearchParams('hash')

setParams({ ...params, foo: 'bar', vueuse: 'awesome' })
// url updated to `#/your/route?foo=bar&vueuse=awesome`
```

### Hash Params

When using with history mode route, but want to use hash as params, specify the `mode` to `hash-params`

```tsx
import { useUrlSearchParams } from '@reause/core'

const [params, setParams] = useUrlSearchParams('hash-params')

setParams({ ...params, foo: 'bar', vueuse: 'awesome' })
// url updated to `/your/route#foo=bar&vueuse=awesome`
```

### Custom Stringify Function

You can provide a custom function to serialize URL parameters using the `stringify` option. This is useful when you need special formatting for your query string.

```tsx
import { useUrlSearchParams } from '@reause/core'

// Custom stringify function that removes equal signs for empty values
const [params, setParams] = useUrlSearchParams('history', {
  stringify: (searchParams) => {
    return searchParams.toString().replace(/=(&|$)/g, '$1')
  },
})

setParams({ ...params, foo: '', bar: 'value' })
// url updated to `?foo&bar=value` instead of `?foo=&bar=value`
```

## Type Declarations

```ts
export type UrlParams = Record<string, string[] | string>
export interface UseUrlSearchParamsOptions<T> extends ConfigurableWindow {
  /**
   * Remove nullish values from the URL when writing back.
   *
   * @default true
   */
  removeNullishValues?: boolean
  /**
   * Remove falsy values from the URL when writing back.
   *
   * @default false
   */
  removeFalsyValues?: boolean
  /**
   * Fallback params used when the URL carries none (URL params win when present, like upstream) and
   * written back to the URL on hydration.
   *
   * @default {}
   */
  initialValue?: T
  /**
   * Write back to `window.history` automatically when the params state changes. As upstream, this
   * only gates the popstate/hashchange → state sync, not the state → URL write-back.
   *
   * @default true
   */
  write?: boolean
  /**
   * Write mode for `window.history` when `write` is enabled
   * - `replace`: replace the current history entry
   * - `push`: push a new history entry
   * @default 'replace'
   */
  writeMode?: "replace" | "push"
  /**
   * Custom function to serialize URL parameters. When provided, this function is used instead of
   * the default `URLSearchParams.toString()`.
   *
   * @param params The URLSearchParams object to serialize
   * @returns The serialized query string (should not include the leading '?' or '#')
   */
  stringify?: (params: URLSearchParams) => string
}
/**
 * Map from @vueuse/core `useUrlSearchParams`
 * (`source/vueuse/packages/core/useUrlSearchParams/`).
 *
 * @example
 * const [params, setParams] = useUrlSearchParams('history')
 *
 * console.log(params.foo) // 'bar'
 *
 * setParams({ ...params, foo: 'bar' })
 * // url updated to `?foo=bar`
 */
export declare function useUrlSearchParams<
  T extends Record<string, any> = UrlParams,
>(
  mode?: "history" | "hash" | "hash-params",
  options?: UseUrlSearchParamsOptions<T>,
): [T, Dispatch<SetStateAction<T>>]
```
