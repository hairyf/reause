import type { Dispatch, SetStateAction } from 'react'
import { useEffect, useRef, useState } from 'react'

export interface UseFaviconOptions {
  /**
   * The base URL to prepend to the favicon path.
   *
   * @default ''
   */
  baseUrl?: string
  /**
   * Specify a custom `document` instance, e.g. working with iframes or in testing environments.
   */
  document?: Document | null
  /**
   * The `<link>` `rel` attribute to manage.
   *
   * @default 'icon'
   */
  rel?: string
}

export type UseFaviconReturn = [
  icon: string | null | undefined,
  setIcon: Dispatch<SetStateAction<string | null | undefined>>,
]

/**
 * Resolve the `document` to work against: an explicitly provided option wins (`null` opts out
 * entirely, mirroring upstream's `ConfigurableDocument`), otherwise the global `document` on the
 * client. Never called during render, so the hook stays safe to use on the server.
 */
function resolveDocument(doc: Document | null | undefined): Document | undefined {
  if (doc !== undefined)
    return doc || undefined
  return typeof document === 'undefined' ? undefined : document
}

/**
 * Map from @vueuse/core `useFavicon`
 * (`source/vueuse/packages/core/useFavicon/`).
 *
 * @example
 * const [icon, setIcon] = useFavicon('dark.png')
 * console.log(icon) // print current icon
 * setIcon('light.png') // change current icon
 */
export function useFavicon(
  newIcon?: string | null | undefined,
  options: UseFaviconOptions = {},
): UseFaviconReturn {
  // options are read through a latest-value ref so the effects below stay
  // stable and always read the newest options (house pattern)
  const optionsRef = useRef(options)
  optionsRef.current = options

  // upstream: `toRef(newIcon)` — `undefined` falls back to the default `null`
  const [icon, setIcon] = useState<string | null | undefined>(
    () => newIcon === undefined ? null : newIcon,
  )

  const setFavicon: Dispatch<SetStateAction<string | null | undefined>> = (next) => {
    setIcon(next)
  }

  // The DOM write is an effect on the state (upstream: `watch` with
  // `immediate: true`, which also covers the initial icon on mount).
  useEffect(() => {
    if (typeof icon !== 'string')
      return

    const doc = resolveDocument(optionsRef.current.document)
    if (!doc?.head)
      return

    const { baseUrl = '', rel = 'icon' } = optionsRef.current
    const elements = doc.head.querySelectorAll<HTMLLinkElement>(`link[rel*="${rel}"]`)
    if (elements.length === 0) {
      const link = doc.createElement('link')
      link.rel = rel
      link.href = `${baseUrl}${icon}`
      link.type = `image/${icon.split('.').pop()}`
      doc.head.append(link)
      return
    }
    elements.forEach((el) => {
      el.href = `${baseUrl}${icon}`
    })
  }, [icon])

  return [icon, setFavicon]
}
