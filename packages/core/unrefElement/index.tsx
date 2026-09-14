import type { RefObject } from 'react'

/**
 * Return type of `unrefElement`. Upstream keeps the Vue component-instance branch (`T extends
 * VueInstance ? Exclude<MaybeElement, VueInstance>: T | undefined`); React refs hold DOM nodes
 * directly, so it simply resolves to `T | undefined`.
 */
export type UnRefElementReturn<T> = T | undefined

/**
 * Get the DOM element a React ref object currently holds.
 *
 * Map from @vueuse/core `unrefElement`
 * (`source/vueuse/packages/core/unrefElement/`), which unwraps a Vue ref or
 * component instance to its underlying DOM element (`plain?.$el ?? plain`).
 *
 * React adaptation: there is no Vue component-instance analog in React — refs already hold DOM
 * nodes via `{ current }` — so the `$el` unwrap branch and the `VueInstance` members of upstream's
 * `MaybeElement` are omitted. Unlike upstream's `MaybeRef` input, reause binds DOM targets to React
 * refs only: the input is a `RefObject` (never a plain element, a getter or a Vue ref), and the
 * function resolves it to `.current` (or `undefined` when empty).
 *
 * Callback refs are NOT supported: React's `RefCallback` (`ref={(el) => {... }}`) is a function and
 * cannot be read synchronously. `ElementTarget` therefore excludes the `RefCallback` arm; pass a
 * `useRef` object (`{ current }`) instead.
 *
 * @param elRef - React ref object (`{ current }`) holding the element;
 * callback refs are rejected at the type level
 * @example
 * const div = useRef<HTMLDivElement>(null)
 * div.current = document.querySelector<HTMLDivElement>('div')!
 * console.log(unrefElement(div)) // the <div> element (div.current)
 */
export function unrefElement<T>(
  elRef: RefObject<T | null | undefined>,
): UnRefElementReturn<T> {
  return (elRef.current ?? undefined) as UnRefElementReturn<T>
}
