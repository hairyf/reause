---
category: Sensors
---

# useElementRemoval

Fires when the element or any element containing it is removed from the DOM.

## Usage

```tsx
import { useElementRemoval } from '@reause/core'
import { useRef, useState } from 'react'

const btnRef = useRef<HTMLButtonElement | null>(null)
const [btnState, setBtnState] = useState(true)
const [removedCount, setRemovedCount] = useState(0)

function btnOnClick() {
  setBtnState(state => !state)
}

useElementRemoval(btnRef, () => setRemovedCount(count => count + 1))

// <button onClick={btnOnClick}>recreate me</button>
// {btnState && <button ref={btnRef} onClick={btnOnClick}>remove me</button>}
// <b>removed times: {removedCount}</b>
```

### Callback with Mutation Records

The callback receives an array of `MutationRecord` objects that triggered the removal.

```ts
import { useElementRemoval } from '@reause/core'

useElementRemoval(targetRef, (mutationRecords) => {
  console.log('Element removed', mutationRecords)
})
```

### Return Value

Returns a stop function to stop observing.

```ts
const stop = useElementRemoval(targetRef, callback)

// Later, stop observing
stop()
```

## Type Declarations

```ts
/**
 * Options for `useElementRemoval`: the `document` (or open `ShadowRoot`) whose
 * subtree is observed, plus a custom `window` instance, e.g. working with
 * iframes or in testing environments.
 */
export interface UseElementRemovalOptions extends ConfigurableWindow {
  /**
   * Custom `document` or open `ShadowRoot` to observe removals in, e.g. working
   * with iframes or in testing environments (upstream:
   * `ConfigurableDocumentOrShadowRoot`). Inlined here — `ConfigurableDocument`
   * is not ported to `@reause/shared`, so `document?` mirrors the option
   * `useActiveElement` exposes.
   *
   * @default the resolved `window`'s `document` on the client
   */
  document?: Document | ShadowRoot
}
/**
 * Return of `useElementRemoval`: the stop handle (upstream's `Fn`).
 */
export type UseElementRemovalReturn = () => void
/**
 * Fires when the element or any element containing it is removed.
 *
 * Map from @vueuse/core `onElementRemoval`
 * (`source/vueuse/packages/core/onElementRemoval/`). `callback` runs whenever
 * the target element — or any ancestor holding it — leaves the DOM; the
 * `MutationRecord[]` that reported the removal is passed to it verbatim, so
 * one callback can cover a batch of removals (upstream passes the whole
 * delivered `mutationsList`, not just the matching records).
 *
 * React divergences:
 * - the Vue `watchEffect` over `unrefElement(target)` becomes an effect that
 *   runs after every render and reconciles the observer against the resolved
 *   `window`/`document`; unchanged renders never re-observe, so pending
 *   mutation records are not dropped on an unnecessary reconnect;
 * - upstream composes `useMutationObserver(document, ...)`, whose target is the
 *   document rather than the element. This repo's `useMutationObserver` is
 *   typed for element targets, so the observer is built here directly on the
 *   resolved `document` / `ShadowRoot` with `{ childList: true, subtree: true }`
 *   — the same shape `useActiveElement` uses for its `triggerOnRemoval`;
 * - the target element is resolved at delivery time instead of at observer
 *   construction, so a ref that attaches after mount is tracked even without a
 *   re-render (upstream re-creates its observer whenever the element changes);
 * - `flush` (upstream defaults to `'sync'`) has no React equivalent — the
 *   observer is always attached in an effect and callbacks are delivered by the
 *   platform `MutationObserver`;
 * - `tryOnScopeDispose(stopHandle)` becomes an unmount effect that disconnects;
 *   the returned stop handle matches upstream, and calling it twice is a no-op
 *   — the hook does not restart after `stop()`;
 * - with no `window`/`document` (SSR, or an explicitly disabled `window`
 *   option) nothing is observed and the returned stop handle is inert, which is
 *   what upstream's `return noop` amounts to.
 *
 * SSR-safe: nothing touches `window` or the DOM during render — the observer is
 * only created inside an effect.
 *
 * @see https://vueuse.org/core/onElementRemoval/
 *
 * @param target - element or React ref object (`{ current }`) whose removal, or
 *   the removal of any element containing it, is reported
 * @param callback - receives the `MutationRecord[]` that reported the removal
 * @param options - `document` / `window` overrides
 *
 * @example
 * const btnRef = useRef<HTMLButtonElement | null>(null)
 * const [removedCount, setRemovedCount] = useState(0)
 *
 * useElementRemoval(btnRef, () => setRemovedCount(count => count + 1))
 *
 * // later, stop observing
 * const stop = useElementRemoval(btnRef, callback)
 * stop()
 */
export declare function useElementRemoval(
  target: RefObject<Element | null | undefined>,
  callback: (mutationRecords: MutationRecord[]) => void,
  options?: UseElementRemovalOptions,
): UseElementRemovalReturn
```
