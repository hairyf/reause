import type { ConfigurableWindow } from '@reause/shared'
import { useEffect, useRef, useState } from 'react'

export interface UseActiveElementOptions extends ConfigurableWindow {
  /**
   * Custom `document` or open `ShadowRoot` to read `activeElement` from, e.g. working with iframes
   * or in testing environments.
   *
   * @default the resolved `window`'s `document` on the client
   */
  document?: Document | ShadowRoot
  /**
   * Search active element deeply inside shadow DOM
   *
   * @default true
   */
  deep?: boolean
  /**
   * Track active element when it's removed from the DOM (a `MutationObserver` under the hood)
   *
   * @default false
   */
  triggerOnRemoval?: boolean
}

/**
 * Map from @vueuse/core `useActiveElement`
 * (`source/vueuse/packages/core/useActiveElement/`).
 *
 * @see https://vueuse.org/core/useActiveElement/
 * @param options - UseActiveElementOptions
 *
 * @example
 * const activeElement = useActiveElement()
 * // re-renders when focus moves to another element
 */
export function useActiveElement<T extends HTMLElement = HTMLElement>(
  options: UseActiveElementOptions = {},
): T | undefined {
  const { deep = true, triggerOnRemoval = false } = options
  const [activeElement, setActiveElement] = useState<T | undefined>(undefined)

  // Latest tracked element, so the `triggerOnRemoval` observer can check the
  // removal of the currently active element without re-binding on each focus
  // change (upstream: the `watchEffect` over the active element ref).
  const activeElementRef = useRef<T | undefined>(undefined)

  useEffect(() => {
    const win = options.window ?? (typeof window === 'undefined' ? undefined : window)
    const doc = options.document ?? win?.document
    if (!doc || !win)
      return

    const getDeepActiveElement = (): T | undefined => {
      let element = doc.activeElement as T | null | undefined
      if (deep) {
        while (element?.shadowRoot)
          element = element.shadowRoot?.activeElement as T | null | undefined
      }
      return element ?? undefined
    }

    const trigger = () => {
      const element = getDeepActiveElement()
      activeElementRef.current = element
      setActiveElement(element)
    }

    const listenerOptions: AddEventListenerOptions = { capture: true, passive: true }
    const onBlur = (event: FocusEvent) => {
      if (event.relatedTarget !== null)
        return
      trigger()
    }
    const onFocus = () => trigger()
    const onPointerDown = () => trigger()

    win.addEventListener('blur', onBlur, listenerOptions)
    win.addEventListener('focus', onFocus, listenerOptions)
    win.addEventListener('pointerdown', onPointerDown, listenerOptions)

    let observer: MutationObserver | null = null
    if (triggerOnRemoval && 'MutationObserver' in win) {
      const winWithObserver = win as unknown as { MutationObserver: typeof MutationObserver }
      observer = new winWithObserver.MutationObserver((mutations) => {
        const element = activeElementRef.current
        if (!element)
          return
        const targetRemoved = mutations
          .flatMap(mutation => [...mutation.removedNodes])
          .some(node => node === element || node.contains(element))
        if (targetRemoved)
          trigger()
      })
      observer.observe(doc, { childList: true, subtree: true })
    }

    trigger()

    return () => {
      win.removeEventListener('blur', onBlur, { capture: true })
      win.removeEventListener('focus', onFocus, { capture: true })
      win.removeEventListener('pointerdown', onPointerDown, { capture: true })
      observer?.disconnect()
    }
  }, [options.window, options.document, deep, triggerOnRemoval])

  return activeElement
}
