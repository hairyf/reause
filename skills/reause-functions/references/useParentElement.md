---
category: Elements
---

# useParentElement

Get parent element of the given element

## Usage

```tsx
import { useParentElement } from '@reause/core'
import { useRef } from 'react'

const childRef = useRef<HTMLDivElement>(null)
const parent = useParentElement(childRef) // HTMLElement | SVGElement | null | undefined

```

## Type Declarations

```ts
type ElementSource = HTMLElement | SVGElement | null | undefined
/**
 * React port of VueUse's `useParentElement`.
 *
 * Map from @vueuse/core `useParentElement`
 * (`source/vueuse/packages/core/useParentElement/`). Get the parent element
 * of the given element.
 *
 * Mapping: upstream returns a read-only `ShallowRef` set on mount and re-set
 * by `watch(() => toValue(element))` whenever the source element changes →
 * `useState` + a `useEffect` that re-resolves the source after every commit.
 * The source must be read post-commit: React attaches a ref's `.current` in
 * the commit phase (after render), so resolving it while rendering returns
 * `null` for the canonical `useRef(null)` usage. The Vue ref return becomes a
 * plain value (no `.value`). The source accepts a plain element or a React
 * ref (upstream: `MaybeRefOrGetter<HTMLElement | SVGElement | null | undefined>`).
 *
 * Divergences from upstream (Vue reactivity does not translate 1:1):
 *
 * 1. No implicit current element: upstream's no-argument form defaults to
 *    `useCurrentElement()` (the current component's root element). React has
 *    no implicit "current component element" — pass an explicit element or
 *    ref; without one the value stays `undefined`.
 * 2. Like upstream's `if (el)` guard, a `null` / `undefined` source keeps
 *    the previously captured parent instead of resetting it.
 * 3. SSR-safe: the parent is captured in an effect, so no DOM is accessed
 *    while rendering and the value stays `undefined` on the server.
 * 4. Mutating a ref's `.current` does not re-render in React — the next commit
 *    picks the new element up (mirroring upstream's `watch` re-firing on ref
 *    change), and a commit-time attach is captured without any extra render.
 *
 * @example
 * const childRef = useRef<HTMLDivElement>(null)
 * const parent = useParentElement(childRef)
 */
export declare function useParentElement(
  element?: RefObject<ElementSource>,
): ElementSource
```
