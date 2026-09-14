import { useEffect, useState } from 'react'

export type KeyModifier = 'Alt' | 'AltGraph' | 'CapsLock' | 'Control' | 'Fn' | 'FnLock' | 'Meta' | 'NumLock' | 'ScrollLock' | 'Shift' | 'Symbol' | 'SymbolLock'

const defaultEvents: (keyof WindowEventMap)[] = ['mousedown', 'mouseup', 'keydown', 'keyup']

export interface UseModifierOptions<Initial> {
  /**
   * Event names that will prompt update to modifier states
   *
   * @default ['mousedown', 'mouseup', 'keydown', 'keyup']
   */
  events?: (keyof WindowEventMap)[]

  /**
   * Initial value of the returned state
   *
   * @default null
   */
  initial?: Initial

  /**
   * Specify a custom `document` instance, e.g. working with iframes or in testing environments.
   */
  document?: Document
}

export type UseKeyModifierReturn<Initial> = Initial extends boolean ? boolean : boolean | null

/**
 * Map from @vueuse/core `useKeyModifier`
 * (`source/vueuse/packages/core/useKeyModifier/`). Reactive
 * [Modifier State](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/getModifierState)
 * — tracks the state of any supported modifier key (`CapsLock`, `NumLock`, `Shift`, `Ctrl`, `Alt`,
 * `Meta`...) by reading `event.getModifierState()` on the configured events.
 *
 * React divergences:
 * - upstream's `useEventListener` composition becomes a self-contained mount
 *   `useEffect` that binds the configured events on the (optionally custom)
 *   `document` and removes them on unmount;
 * - the `initial` option feeds `useState`, so SSR renders the `null` default
 *   without touching the DOM.
 *
 * @example
 * const capsLockState = useKeyModifier('CapsLock') // boolean | null
 */
export function useKeyModifier<Initial extends boolean | null>(modifier: KeyModifier, options: UseModifierOptions<Initial> = {}): UseKeyModifierReturn<Initial> {
  const {
    events = defaultEvents,
    document: customDocument = typeof document === 'undefined' ? undefined : document,
    initial = null,
  } = options

  const [state, setState] = useState<UseKeyModifierReturn<Initial>>(initial as UseKeyModifierReturn<Initial>)

  useEffect(() => {
    const doc = customDocument
    if (!doc)
      return

    const handler = (event: Event) => {
      const evt = event as KeyboardEvent | MouseEvent
      if (typeof evt.getModifierState === 'function')
        setState(evt.getModifierState(modifier))
    }

    const listenerOptions = { passive: true }
    events.forEach((eventName) => {
      doc.addEventListener(eventName, handler, listenerOptions)
    })

    return () => {
      events.forEach((eventName) => {
        doc.removeEventListener(eventName, handler)
      })
    }
  }, [customDocument, events, modifier])

  return state
}
