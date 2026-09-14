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
 * (`source/vueuse/packages/core/useFavicon/`). Reactive favicon: keeps the
 * current favicon URL in component state and writes it back to the `<link rel="icon">` element(s)
 * in the document `<head>` on change (creating one when none exists).
 *
 * React divergences:
 * - upstream adopts the value at setup and applies it synchronously via a
 *   `watch(..., { immediate: true })`; React must not touch the DOM during
 *   render (SSR-safe), so the DOM write happens in an effect — the initial
 *   icon is applied on mount instead;
 * - the icon write is a `useEffect` on the state instead of a Vue watcher;
 * - `newIcon` is a read-only value source and takes a plain `string | null | undefined`. The
 * returned setter owns the state from mount on — the argument is only the initial value, so the
 * setter stays authoritative (upstream returns the very ref it was given and can therefore be
 * written through);
 * - setting `null`/`undefined` through the setter updates the state but
 *   leaves the existing `<link>` untouched (upstream would leave it stale
 *   too, since the watcher only applies string values).
 *
 * It's not SSR compatible: your value will be applied only on client-side.
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
