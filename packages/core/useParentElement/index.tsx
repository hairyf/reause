import type { RefObject } from 'react'
import { useEffect, useState } from 'react'
import { unrefElement } from '../unrefElement'

type ElementSource = HTMLElement | SVGElement | null | undefined

/**
 * Map from @vueuse/core `useParentElement`
 * (`source/vueuse/packages/core/useParentElement/`).
 *
 * @example
 * const childRef = useRef<HTMLDivElement>(null)
 * const parent = useParentElement(childRef)
 */
export function useParentElement(
  element?: RefObject<ElementSource>,
): ElementSource {
  const [parentElement, setParentElement] = useState<ElementSource>()

  // No dependency array on purpose: re-resolve the source after *every*
  // commit, which is the React equivalent of upstream's
  // `tryOnMounted(update)` + `watch(() => toValue(element), update)`. This is
  // what makes a ref attached during the commit phase visible (see mapping
  // note above) and what re-captures a late-attached element.
  useEffect(() => {
    const el = element ? unrefElement(element) : undefined
    // mirrors upstream's `if (el)` guard: a null/undefined element keeps the
    // previously captured parent instead of resetting it
    if (el)
      setParentElement(el.parentElement)
  })

  return parentElement
}
