import { useEffect, useState } from 'react'

export interface UseDocumentVisibilityOptions {
  /**
   * Specify a custom `document` instance, e.g. working with iframes or in testing environments.
   *
   * @default typeof document !== 'undefined' ? document : undefined
   */
  document?: Document | null
}

/**
 * Map from @vueuse/core `useDocumentVisibility`
 * (`source/vueuse/packages/core/useDocumentVisibility/`).
 *
 * @example
 * const visibility = useDocumentVisibility()
 */
export function useDocumentVisibility(options: UseDocumentVisibilityOptions = {}): DocumentVisibilityState {
  const [visibility, setVisibility] = useState<DocumentVisibilityState>('visible')

  useEffect(() => {
    const doc = options.document === undefined
      ? (typeof document === 'undefined' ? undefined : document)
      : options.document
    if (!doc)
      return

    const update = () => {
      setVisibility(doc.visibilityState)
    }
    update()

    doc.addEventListener('visibilitychange', update, { passive: true })
    return () => {
      doc.removeEventListener('visibilitychange', update)
    }
  }, [options.document])

  return visibility
}
