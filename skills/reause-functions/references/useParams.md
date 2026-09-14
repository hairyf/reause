---
category: Browser
---

# useParams

Shorthand for a reactive path parameter in `window.location.pathname`, matched against a `pattern` path template. Updates the URL path when the value changes.

## Usage

```tsx
import { useParams } from '@reause/core'

const [userId, setUserId] = useParams('userId', '-1', { pattern: '/users/:userId' }) // or with a default value

const [page, setPage] = useParams<string>('page', '1', { pattern: '/posts/:page', transform: Number }) // or transforming value

console.log(userId) // the `userId` segment of window.location.pathname
setUserId('100') // history.replaceState with `/users/100`
```

### Pattern Matching

Upstream proxies `route.params` through vue-router, whose route config defines which path segments are params. Since this hook has no routing library, that config has to be passed explicitly as the `pattern` option: a path template whose `:name` segments capture the matching `window.location.pathname` segment, while plain segments must match literally.

```tsx
import { useParams } from '@reause/core'
// ---cut---
const [userId, setUserId] = useParams('userId', '', { pattern: '/users/:userId' })

// URL `/users/42`        -> userId is '42'
// URL `/users/`          -> userId is '' (the default, empty capture)
// URL `/profile/42`      -> userId is '' (the default, no match)
// No pattern given       -> userId is '' (the default)
```

### Navigation Mode

By default, changes use `history.replaceState()`. Set `mode: 'push'` to use `history.pushState()` instead.

```tsx
import { useParams } from '@reause/core'
// ---cut---
const [userId, setUserId] = useParams('userId', '', { pattern: '/users/:userId', mode: 'push' })
```

### Bidirectional Transform

You can provide separate `get` and `set` transforms for reading and writing values.

```tsx
import { useParams } from '@reause/core'
// ---cut---
const [userId, setUserId] = useParams('userId', '', {
  pattern: '/users/:userId',
  transform: {
    get: v => v.toUpperCase(),
    set: v => v.toLowerCase(),
  },
})

// Reading: URL `/users/alice` -> 'ALICE'
// Writing: 'ALICE'            -> URL `/users/alice`
```

### Default Value Behavior

When the value equals the default value (or is `null`), the param is removed from the URL.

```tsx
import { useParams } from '@reause/core'
// ---cut---
const [userId, setUserId] = useParams('userId', 'guest', { pattern: '/users/:userId' })

setUserId('alice') // URL: /users/alice
setUserId('guest') // URL: /users/ (no param, since it equals default)
```

## React divergences from upstream

- No router dependency: upstream proxies `route.params` through vue-router; this hook matches `window.location.pathname` against the `pattern` option and reads/writes `window.location` / `history` directly, so it needs no routing library.
- Returns the React array tuple `[value, setValue]` (upstream returns a single writable Vue ref).
- Upstream batches multi-key writes per tick through a queue and pushes one router navigation; here each `setValue` performs its own history update immediately.
- There is no multi-page router context: the hook is scoped to the current `window.location` only.

## Type Declarations

```ts
export type RouteParamValueRaw =
  string | number | boolean | null | (string | number | boolean | null)[]
export interface UseParamsOptions<T, K> {
  /**
   * Path template used to locate the param in `window.location.pathname`, e.g. `'/users/:userId'`.
   * A segment starting with `:` captures the corresponding pathname segment; plain segments must
   * match literally. In vue-router this route config comes from the router itself, so here it has
   * to be passed explicitly — without it the hook cannot locate the param and exposes
   * `defaultValue` (it never throws).
   */
  pattern?: string
  /**
   * How a new param value is written into the browser history.
   *
   * - `'replace'`: `history.replaceState` — overwrites the current history
   *   entry.
   * - `'push'`: `history.pushState` — adds a new entry, so the browser's back
   *   button returns to the previous path.
   *
   * @default 'replace'
   */
  mode?: "replace" | "push"
  /**
   * Function to transform data before return, or an object with one or both functions: `get` to
   * transform data before returning, and `set` to transform data before setting.
   */
  transform?:
    | ((value: T) => K)
    | {
        get?: (value: T) => K
        set?: (value: K) => T
      }
}
export declare function useParams(
  name: string,
): [null | string | string[], (value: null | string | string[]) => void]
export declare function useParams<T extends RouteParamValueRaw = string, K = T>(
  name: string,
  defaultValue?: T,
  options?: UseParamsOptions<T, K>,
): [K, (value: K) => void]
```
