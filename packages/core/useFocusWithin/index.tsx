import type { ConfigurableWindow } from '@reause/shared'
import type { ElementTarget } from '../useResizeObserver'
import { useEffect, useRef, useState } from 'react'
import { unrefElement } from '../unrefElement'

export interface UseFocusWithinReturn {
  /**
   * True if the element or any of its descendants are focused
   */
  focused: boolean
}

const EVENT_FOCUS_IN = 'focusin'
const EVENT_FOCUS_OUT = 'focusout'
const PSEUDO_CLASS_FOCUS_WITHIN = ':focus-within'

/**
 * Map from @vueuse/core `useFocusWithin`
 * (`source/vueuse/packages/core/useFocusWithin/`).
 *
 * @param target - React ref object (`RefObject`) holding the element to
 *   track focus within, resolved with the shared `unrefElement`
 * @param options - a custom `window` instance, e.g. working with iframes or
 *   in testing environments
 *
 * @example
 * const target = useRef<HTMLFormElement>(null)
 * const { focused } = useFocusWithin(target)
 * // `focused` is true while the form or any input inside it has focus
 */
export function useFocusWithin(
  target: ElementTarget,
  options: ConfigurableWindow = {},
): UseFocusWithinReturn {
  const [focused, setFocused] = useState(false)
  const targetRef = useRef(target)
  targetRef.current = target
  const listenersRef = useRef<{ element: Element, cleanup: () => void } | null>(null)

  // Bind/unbind the `focusin` / `focusout` listeners after every render,
  // re-binding only when the resolved element or the `window` option changed
  // (upstream: `watch` over `unrefElement(target)` + `useEventListener`).
  useEffect(() => {
    const win = options.window ?? (typeof window === 'undefined' ? undefined : window)

    // Tear down previously bound listeners on every early-return path, so a
    // later render flipping `window` / `activeElement` validity cannot leave
    // stale element listeners firing `setFocused` (upstream binds once at
    // setup, so it has no such path).
    const teardown = () => {
      listenersRef.current?.cleanup()
      listenersRef.current = null
    }

    if (!win) {
      teardown()
      return
    }

    // upstream: `if (!window || !activeElement.value) return { focused }` —
    // with no valid active element, focus tracking is unreliable, so no
    // listeners attach and `focused` stays `false`.
    if (!win.document.activeElement) {
      setFocused(false)
      teardown()
      return
    }

    const element = unrefElement(targetRef.current)
    const current = listenersRef.current
    if (current?.element === element)
      return
    current?.cleanup()
    listenersRef.current = null

    if (!element) {
      setFocused(false)
      return
    }

    const onFocusIn = () => setFocused(true)
    const onFocusOut = () => setFocused(element.matches(PSEUDO_CLASS_FOCUS_WITHIN))
    const listenerOptions: AddEventListenerOptions = { passive: true }

    element.addEventListener(EVENT_FOCUS_IN, onFocusIn, listenerOptions)
    element.addEventListener(EVENT_FOCUS_OUT, onFocusOut, listenerOptions)
    listenersRef.current = {
      element,
      cleanup: () => {
        element.removeEventListener(EVENT_FOCUS_IN, onFocusIn)
        element.removeEventListener(EVENT_FOCUS_OUT, onFocusOut)
      },
    }
  })

  // Remove the listeners on unmount (upstream: `tryOnScopeDispose`). Kept as a
  // separate mount-only effect so render-driven re-runs of the binding effect
  // never tear down listeners whose element is unchanged, and so a StrictMode
  // remount re-binds cleanly.
  useEffect(() => () => {
    listenersRef.current?.cleanup()
    listenersRef.current = null
  }, [])

  return { focused }
}
