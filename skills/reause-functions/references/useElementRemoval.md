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
 * Options for `useElementRemoval`: the `document` (or open `ShadowRoot`) whose subtree is observed,
 * plus a custom `window` instance, e.g. working with iframes or in testing environments.
 */
export interface UseElementRemovalOptions extends ConfigurableWindow {
  /**
   * Custom `document` or open `ShadowRoot` to observe removals in, e.g. working with iframes or in
   * testing environments.
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
 * Map from @vueuse/core `onElementRemoval`
 * (`source/vueuse/packages/core/onElementRemoval/`).
 *
 * @see https://vueuse.org/core/onElementRemoval/
 *
 * @param target - React ref object (`RefObject`) holding the element whose
 *   removal, or the removal of any element containing it, is reported,
 *   resolved with the shared `unrefElement`
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
