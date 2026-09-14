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
 * (`source/vueuse/packages/core/useKeyModifier/`).
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
