# Guidelines

Here are the guidelines for reause hooks. You could also take them as a
reference for authoring your own React hooks or apps.

## General

- Import all React APIs from `"react"`
- Use options object as arguments whenever possible to be more flexible for future extensions
- Use `useState` for state, `useMemo` / `useCallback` for derived values, `useEffect` for side-effects
- Use `configurableWindow` (etc.) when using global variables like `window` to be flexible when working with multi-windows, testing mocks, and SSR
- When involved with Web APIs that are not yet implemented by the browser widely, also outputs `isSupported` flag
- Clean up side-effects in the effect's cleanup function (React does this on unmount for free)
- Avoid using console logs
- When the function is asynchronous, return a PromiseLike

Naming follows the mapping rules in [AGENTS.md](https://github.com/hairyf/reause/blob/main/AGENTS.md):

- `ref*` → `useState*`; `on*` → `use*`; `use*RefHistory` → `useState*History`
- VueUse conversions with **≥2 writable values** return an object with a paired setter each (`useDraggable` → `{ x, setX, y, setY }`); with **exactly 1 writable value** they return a tuple `[value, setValue]` (or `[value, setValue, controls]`)
- With **0 writable values** the structure and naming fully mirror upstream: an upstream object stays an object (`useMouse`, `useClipboard`), a plain value stays plain (`usePreferredDark`)
- `react-use` ports keep the upstream React API as-is (direct mirror)

Read also: [Best Practice](./guide/best-practice.md)

## Argument Types

- **Read-only value sources** (e.g. `useTitle`'s title, `useFetch`'s url):
  accept plain values only (`T`) — not refs, getters, or `State<T>`.
- **Internal write parameters**: accept `State<T>` — a plain value, a getter, a
  `[value, setter]` tuple or a `{ value, onChange }` pair (never a React ref).
- **DOM hook arguments** (element targets): accept a React `RefObject<T | null>`
  — the element is read with `unrefElement`, so a plain element, a getter or a
  callback ref is not accepted. Multiple targets are an array of same-element
  `RefObject`s (`ElementTargetOrArray<T>`).

## Configurable Globals

When using global variables like `window` or `document`, support
`configurableWindow` or `configurableDocument` in the options interface to make
the hook flexible for scenarios like multi-windows, testing mocks, and SSR.

```tsx
import type { ConfigurableWindow } from '@reause/shared'

export function useActiveElement(
  options: ConfigurableWindow = {},
) {
  const {
    // the global window on the client, `undefined` on the server (SSR) —
    // `@reause/shared` has no `defaultWindow` helper to import
    window = typeof globalThis.window === 'undefined' ? undefined : globalThis.window,
  } = options

  // skip when in Node.js environment (SSR)
  useEffect(() => {
    if (window) {
      // handle window events
    }

    // ...
  }, [window])

  /* ... */
}
```

Usage example:

```tsx
// in iframe and bind to the parent window
useActiveElement({ window: window.parent })
```

## Controls

VueUse uses the `controls` option allowing users to use functions with a single
return for simple usages, while being able to have more controls and
flexibility when needed. reause mirrors this for the hooks that have it.

### When to provide a `controls` option

- The hook is more commonly used with a single value, e.g. `useNow`, `useInterval`

```tsx
// common usage
const now = useNow()

// more controls for flexibility
const { now, isActive, pause, resume } = useNow({ controls: true })
```

#### When **NOT** to provide a `controls` option

- The hook is more commonly used with multiple returns, e.g. `useRafFn`, `useStateHistory`

```tsx
const { pause, resume } = useRafFn(() => {})
```

## `isSupported` Flag

When involved with Web APIs that are not yet implemented by the browser widely,
also outputs `isSupported` flag.

For example `useShare`:

```tsx
import { useShare } from '@reause/core'

const { isSupported, share } = useShare()
```

The same pattern applies to `useClipboard`:

```tsx
const { isSupported, copy, copied } = useClipboard()
```

## Asynchronous Hooks

When a hook is asynchronous, like `useFetch`, it is a good idea to return a
PromiseLike object so the user is able to await the hook. This is especially
useful inside async event handlers.

```tsx
import { useFetch } from '@reause/core'

// awaited directly — resolves when the request finishes
const { isFetching, error, data } = await useFetch(url)
```

## Unmount Cleanup

React runs effect cleanup automatically on unmount, so hooks do not need an
explicit `onUnmounted` API — every subscription created in a `useEffect` is
torn down when the component unmounts. When a hook needs manual disposal, it
returns a stop handler (e.g. `useEventListener`'s returned cleanup function).
