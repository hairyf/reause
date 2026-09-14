import type { Dispatch, SetStateAction } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'

export type UseTextDirectionValue = 'ltr' | 'rtl' | 'auto'

export interface UseTextDirectionOptions {
  /**
   * CSS selector for the target element applying to.
   *
   * @default 'html'
   */
  selector?: string
  /**
   * Observe `document.querySelector(selector)` changes using a MutationObserver.
   *
   * @default false
   */
  observe?: boolean
  /**
   * Initial value, also the SSR default — no `document` access happens during render.
   *
   * @default 'ltr'
   */
  initialValue?: UseTextDirectionValue
  /**
   * Specify a custom `document` instance, e.g. working with iframes or in testing environments.
   */
  document?: Document
}

export type UseTextDirectionReturn = [
  dir: UseTextDirectionValue,
  setDir: Dispatch<SetStateAction<UseTextDirectionValue>>,
]

function getDir(doc: Document | undefined, selector: string, initialValue: UseTextDirectionValue) {
  return (doc?.querySelector(selector)?.getAttribute('dir') as UseTextDirectionValue | null) ?? initialValue
}

/**
 * Map from @vueuse/core `useTextDirection`
 * (`source/vueuse/packages/core/useTextDirection/`).
 *
 * @example
 * const [dir, setDir] = useTextDirection()
 * // <html dir="rtl"> → dir === 'rtl'
 * setDir('ltr') // writes dir="ltr" back to <html>
 */
export function useTextDirection(options: UseTextDirectionOptions = {}): UseTextDirectionReturn {
  const {
    document: customDocument = typeof document === 'undefined' ? undefined : document,
    selector = 'html',
    observe = false,
    initialValue = 'ltr',
  } = options

  const [dir, setDirState] = useState<UseTextDirectionValue>(initialValue)

  // latest-value ref so the setter below stays a stable callback that
  // resolves updater functions against the newest rendered value
  const dirRef = useRef(dir)
  dirRef.current = dir

  const applyDir = useCallback((value: UseTextDirectionValue) => {
    dirRef.current = value
    setDirState(value)
  }, [])

  useEffect(() => {
    // sync from the DOM after mount (upstream: tryOnMounted re-read)
    applyDir(getDir(customDocument, selector, initialValue))

    if (!observe || !customDocument)
      return

    const target = customDocument.querySelector(selector)
    if (!target)
      return

    const observer = new MutationObserver(() => applyDir(getDir(customDocument, selector, initialValue)))
    observer.observe(target, { attributes: true })

    return () => {
      observer.disconnect()
    }
  }, [applyDir, customDocument, selector, observe, initialValue])

  const setDir = useCallback<Dispatch<SetStateAction<UseTextDirectionValue>>>((value) => {
    const next = typeof value === 'function'
      ? (value as (prev: UseTextDirectionValue) => UseTextDirectionValue)(dirRef.current)
      : value
    applyDir(next)

    // write through to the DOM (upstream's writable computed `set()`)
    if (!customDocument)
      return
    const element = customDocument.querySelector(selector)
    if (!element)
      return
    // `UseTextDirectionValue` can never be falsy, so the else branch is
    // unreachable through the typed API — kept to mirror upstream's untyped
    // setter, which accepts `''` and removes the attribute.
    if (next)
      element.setAttribute('dir', next)
    else
      element.removeAttribute('dir')
  }, [applyDir, customDocument, selector])

  return [dir, setDir]
}
