import { useTimeoutFn } from '@reause/shared'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useSupported } from '../useSupported'

export interface UseClipboardItemsOptions<Source> {
  /**
   * Enabled reading for clipboard
   *
   * @default false
   */
  read?: boolean

  /**
   * Copy source
   */
  source?: Source

  /**
   * Milliseconds to reset state of `copied`
   *
   * @default 1500
   */
  copiedDuring?: number

  /**
   * Specify a custom `navigator` instance, e.g. working with iframes or in testing environments.
   * Declared inline instead of composing a shared `ConfigurableNavigator` type because other core
   * hooks export a same-named type — `export *` in `index.ts` would collide (TS2308), so like
   * `useGamepad` this module declares the member directly.
   */
  navigator?: Navigator
}

export interface UseClipboardItemsReturn<Optional> {
  /**
   * `true` when the resolved navigator exposes the Clipboard API (`'clipboard' in navigator`).
   * Resolved in a mount effect, so it stays `false` during the first render and on the server
   * (SSR-safe).
   */
  isSupported: boolean
  /**
   * The clipboard items currently read from the system clipboard. Updated by a successful `copy`,
   * by a manual `read()` call, and automatically when `read` is enabled and a `copy` / `cut` event
   * fires.
   */
  content: ClipboardItems
  /**
   * Whether the last `copy` call succeeded. Resets to `false` after `copiedDuring` milliseconds via
   * a timeout.
   */
  copied: boolean
  /**
   * Asynchronously writes `content` to the system clipboard. When the `source` option is provided
   * it may be called without arguments; it is a no-op (resolves without writing) when the Clipboard
   * API is unsupported or when no value is available.
   *
   * The parameter is named `content` — upstream names it `text` (`copy: (text: ClipboardItems) =>
   * Promise<void>`). Same type and semantics; `content` matches the returned `content` value and
   * avoids confusion with `useClipboard`'s text-only `text`.
   */
  copy: Optional extends true
    ? (content?: ClipboardItems) => Promise<void>
    : (content: ClipboardItems) => Promise<void>
  /**
   * Manually reads the current clipboard content into `content`.
   */
  read: () => void
}

/**
 * Map from @vueuse/core `useClipboardItems`
 * (`source/vueuse/packages/core/useClipboardItems/`).
 *
 * @example
 * const source = [
 *   new ClipboardItem({
 *     'text/plain': new Blob(['plain text'], { type: 'text/plain' }),
 *   }),
 * ]
 *
 * const { isSupported, content, copy, copied } = useClipboardItems({ source })
 */
export function useClipboardItems(options?: UseClipboardItemsOptions<undefined>): UseClipboardItemsReturn<false>
export function useClipboardItems(options: UseClipboardItemsOptions<ClipboardItems>): UseClipboardItemsReturn<true>
export function useClipboardItems(options: UseClipboardItemsOptions<ClipboardItems | undefined> = {}): UseClipboardItemsReturn<boolean> {
  const {
    navigator: customNavigator,
    read = false,
    source,
    copiedDuring = 1500,
  } = options

  // latest-value refs synced each render so the mount support probe and the
  // stable callbacks always read the newest navigator / source (React has no
  // reactive refs — upstream destructures these once at setup)
  const navigatorRef = useRef<Navigator | undefined>(undefined)
  navigatorRef.current = customNavigator ?? (typeof navigator === 'undefined' ? undefined : navigator)
  const sourceRef = useRef<ClipboardItems | undefined>(source)
  sourceRef.current = source

  const isSupported = useSupported(() => {
    const nav = navigatorRef.current
    return Boolean(nav && 'clipboard' in nav)
  })

  const [content, setContent] = useState<ClipboardItems>([])
  const [copied, setCopied] = useState(false)

  // resets `copied` to `false` after `copiedDuring` (upstream `useTimeoutFn`)
  const { start } = useTimeoutFn(() => setCopied(false), copiedDuring, { immediate: false })

  // upstream `updateContent` — reads the clipboard into `content`
  const updateContent = useCallback(() => {
    const nav = navigatorRef.current
    if (nav && 'clipboard' in nav) {
      nav.clipboard.read().then((items) => {
        setContent(items)
      })
    }
  }, [])

  // copy/cut listeners keep `content` fresh when reading is enabled
  // (upstream `useEventListener(['copy', 'cut'], updateContent, ...)` bound
  // only when the Clipboard API is supported and `read` is enabled).
  // `useEventListener` is not reused here: its event argument cannot be an
  // empty array, and an empty array would be misparsed as a target-first
  // overload, invoking the listener through `toValue` during render. A
  // self-contained effect (like `useMagicKeys` / `useNetwork`) binds the
  // listeners only while `read && isSupported` and removes them on unmount.
  useEffect(() => {
    if (!read || !isSupported)
      return

    const handler = () => updateContent()
    window.addEventListener('copy', handler, { passive: true })
    window.addEventListener('cut', handler, { passive: true })

    return () => {
      window.removeEventListener('copy', handler)
      window.removeEventListener('cut', handler)
    }
  }, [read, isSupported, updateContent])

  const copy = useCallback(async (value?: ClipboardItems) => {
    const resolved = value === undefined ? sourceRef.current : value
    const nav = navigatorRef.current
    if (nav && 'clipboard' in nav && resolved != null) {
      await nav.clipboard.write(resolved)
      setContent(resolved)
      setCopied(true)
      start()
    }
  }, [start])

  return { isSupported, content, copied, copy, read: updateContent }
}
