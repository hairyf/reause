import type { ConfigurableWindow } from '@reause/shared'
import { useEffect, useState } from 'react'

/**
 * Map from @vueuse/core `usePageLeave`
 * (`source/vueuse/packages/core/usePageLeave/`).
 *
 * @example
 * const isLeft = usePageLeave()
 */
export function usePageLeave(options: ConfigurableWindow = {}): boolean {
  const [isLeft, setIsLeft] = useState(false)

  useEffect(() => {
    // default substitution only for `undefined` — an explicit `window: null`
    // keeps the hook inert (no listeners, `false`), matching upstream's
    // `window = defaultWindow` destructure
    const win = options.window === undefined
      ? (typeof window === 'undefined' ? undefined : window)
      : options.window
    if (!win)
      return

    const handler = (event: MouseEvent) => {
      const from = event.relatedTarget || (event as MouseEvent & { toElement?: EventTarget | null }).toElement
      setIsLeft(!from)
    }
    const listenerOptions = { passive: true }

    win.addEventListener('mouseout', handler, listenerOptions)
    win.document.addEventListener('mouseleave', handler, listenerOptions)
    win.document.addEventListener('mouseenter', handler, listenerOptions)

    return () => {
      win.removeEventListener('mouseout', handler)
      win.document.removeEventListener('mouseleave', handler)
      win.document.removeEventListener('mouseenter', handler)
    }
  }, [options.window])

  return isLeft
}
