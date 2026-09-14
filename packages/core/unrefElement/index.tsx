import type { RefObject } from 'react'

/**
 * Return type of `unrefElement`. Upstream keeps the Vue component-instance branch (`T extends
 * VueInstance ? Exclude<MaybeElement, VueInstance>: T | undefined`); React refs hold DOM nodes
 * directly, so it simply resolves to `T | undefined`.
 */
export type UnRefElementReturn<T> = T | undefined

/**
 * Map from @vueuse/core `unrefElement`
 * (`source/vueuse/packages/core/unrefElement/`).
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
