import type { ConfigurableWindow } from '@reause/shared'
import { useEffect, useState } from 'react'

/**
 * Map from @vueuse/core `useWindowFocus`
 * (`source/vueuse/packages/core/useWindowFocus/`).
 *
 * @example
 * const focused = useWindowFocus()
 */
export function useWindowFocus(options: ConfigurableWindow = {}): boolean {
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    // `options.window !== undefined` (not `??`): a JS-passed `null` must be
    // preserved so the falsy check below disables tracking, mirroring
    // upstream's `if (!window) return false` — falling through to the real
    // global `window` would attach listeners where upstream attaches none.
    const win = options.window !== undefined ? options.window : (typeof window === 'undefined' ? undefined : window)
    if (!win)
      return

    setFocused(win.document.hasFocus())

    const onFocus = () => setFocused(true)
    const onBlur = () => setFocused(false)
    win.addEventListener('focus', onFocus, { passive: true })
    win.addEventListener('blur', onBlur, { passive: true })

    return () => {
      win.removeEventListener('focus', onFocus)
      win.removeEventListener('blur', onBlur)
    }
  }, [options.window])

  return focused
}
