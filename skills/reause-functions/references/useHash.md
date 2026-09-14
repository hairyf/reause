---
category: Browser
---

# useHash

Shorthand for a reactive `window.location.hash`.

## Usage

```tsx
import { useHash } from '@reause/core'

const [hash, setHash] = useHash()

console.log(hash) // '#foobar'
setHash('foobar') // window.location.hash becomes '#foobar'
```

Pass a default value exposed while the hash is empty, and pick the history mode used when writing it:

```tsx
import { useHash } from '@reause/core'
// ---cut---
const [hash, setHash] = useHash('foobar', { mode: 'push' })
setHash('') // clears the hash, `hash` falls back to 'foobar'
```

## Type Declarations

```ts
export interface UseHashOptions {
  /**
   * How a new hash is written into the browser history.
   *
   * - `'replace'`: `history.replaceState` — overwrites the current history
   *   entry.
   * - `'push'`: `history.pushState` — adds a new entry, so the browser's back
   *   button returns to the previous hash.
   *
   * @default 'replace'
   */
  mode?: "replace" | "push"
}
export type UseHashReturn = [hash: string, setHash: (value: string) => void]
/**
 * Map from @vueuse/router `useRouteHash`
 * (`source/vueuse/packages/router/useRouteHash/`).
 *
 * @see https://vueuse.org/router/useRouteHash/
 *
 * @example
 * const [hash, setHash] = useHash()
 * console.log(hash) // '#foobar'
 * setHash('foobar') // window.location.hash becomes '#foobar'
 */
export declare function useHash(
  defaultValue?: string,
  options?: UseHashOptions,
): UseHashReturn
```
