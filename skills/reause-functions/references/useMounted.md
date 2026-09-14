---
category: Component
---

# useMounted

Mounted state in ref.

## Usage

```tsx
import { useMounted } from '@reause/core'

const isMounted = useMounted() // boolean
// starts `false`, flips to `true` in a mount effect — stays `false` during SSR/hydration
```

For the inverse question — whether a component has already unmounted, readable from a callback that outlives the render — use `@reause/shared`'s `useUnmountedRef` instead: `useMounted` returns a boolean for the current render and never flips back, so after unmount it stays `true`, whereas `useUnmountedRef` returns a ref whose `.current` becomes `true` and can be read after the component is gone.

## Type Declarations

```ts
/**
 * React port of VueUse's `useMounted`.
 *
 * Map from @vueuse/core `useMounted`
 * (`source/vueuse/packages/core/useMounted/`). Mounted state as a plain
 * **boolean** — `true` once the component has mounted. (The upstream doc's
 * "Mounted state in ref" wording refers to Vue's `shallowRef`; the React
 * port returns a boolean, never a ref.)
 *
 * Mapping: `shallowRef(false)` + `onMounted` → `useState(false)` + a mount
 * `useEffect` calling the setter. The state update happens after the first
 * render, so the value stays `false` during render and on the server
 * (SSR-safe), then flips to `true` once the effect runs.
 *
 * Must be called inside a component. Upstream guards with
 * `getCurrentInstance()` and returns a `false` ref that never flips when
 * called outside a component; React's rules of hooks have no equivalent
 * guard, so calling `useMounted()` outside a component throws React's
 * standard "Invalid hook call" error.
 *
 * @example
 * const isMounted = useMounted()
 */
export declare function useMounted(): boolean
```
