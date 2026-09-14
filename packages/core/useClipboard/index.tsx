import { useTimeoutFn } from '@reause/shared'
import { useCallback, useEffect, useRef, useState } from 'react'
import { usePermission } from '../usePermission'
import { useSupported } from '../useSupported'

export interface UseClipboardOptions<Source> {
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
   * Milliseconds to reset state of `copied` state
   *
   * @default 1500
   */
  copiedDuring?: number

  /**
   * Whether fallback to document.execCommand('copy') if clipboard is undefined.
   *
   * @default false
   */
  legacy?: boolean

  /**
   * Specify a custom `navigator` instance, e.g. working with iframes or in testing environments.
   */
  navigator?: Navigator
}

type ClipboardValue = string | (() => Promise<string | undefined>)

export interface UseClipboardReturn<Optional> {
  /**
   * `true` when the resolved navigator exposes `clipboard` (native Clipboard API) or `legacy: true`
   * opts into the `document.execCommand` fallback. Resolved in a mount effect, so it stays `false`
   * during the first render and on the server (SSR-safe).
   */
  isSupported: boolean
  /**
   * Current clipboard text — updated by `copy` and, when `read: true`, by `copy`/`cut` events on
   * `window`.
   */
  text: string
  /**
   * `true` after a successful copy, auto-resets to `false` after `copiedDuring` milliseconds.
   */
  copied: boolean
  /**
   * `true` while a `copy` call is in flight.
   */
  copyPending: boolean
  /**
   * Writes to the clipboard. Resolves when the write completes — through the native Async Clipboard
   * API when available, falling back to `document.execCommand('copy')` otherwise. Accepts a string
   * or a promise producing one. When `source` is provided, it can be called without an argument to
   * copy the (resolved) source value.
   */
  copy: Optional extends true
    ? (text?: ClipboardValue) => Promise<void>
    : (text: ClipboardValue) => Promise<void>
}

function isAllowed(status: PermissionState | undefined) {
  return status === 'granted' || status === 'prompt'
}

function legacyCopy(value: string) {
  const ta = document.createElement('textarea')
  ta.value = value
  ta.style.position = 'absolute'
  ta.style.opacity = '0'
  ta.setAttribute('readonly', '')
  document.body.appendChild(ta)
  ta.select()
  document.execCommand('copy')
  ta.remove()
}

function legacyRead() {
  return document?.getSelection?.()?.toString() ?? ''
}

function createClipboardItem(
  value: ClipboardValue,
  setText: (text: string) => void,
): ClipboardItem {
  if (typeof value === 'string') {
    setText(value)
    return new ClipboardItem({ 'text/plain': value })
  }
  return new ClipboardItem({
    'text/plain': value().then((resolvedText = '') => {
      setText(resolvedText)
      return new Blob([resolvedText], { type: 'text/plain' })
    }),
  })
}

/**
 * Map from @vueuse/core `useClipboard`
 * (`source/vueuse/packages/core/useClipboard/`).
 *
 * @example
 * const { text, copy, copied, isSupported } = useClipboard({ source: 'Hello' })
 *
 * copy('Hello') // writes to the clipboard; `copied` auto-resets after 1.5s
 */
export function useClipboard(options?: UseClipboardOptions<undefined>): UseClipboardReturn<false>
export function useClipboard(options: UseClipboardOptions<string>): UseClipboardReturn<true>
export function useClipboard(options: UseClipboardOptions<string | undefined> = {}): UseClipboardReturn<boolean> {
  const {
    navigator: customNavigator,
    read = false,
    source,
    copiedDuring = 1500,
    legacy = false,
  } = options

  const defaultNavigator = typeof navigator === 'undefined' ? undefined : navigator
  const navigatorRef = useRef<Navigator | undefined>(customNavigator ?? defaultNavigator)
  navigatorRef.current = customNavigator ?? defaultNavigator

  const isClipboardApiSupported = useSupported(() => navigatorRef.current && 'clipboard' in navigatorRef.current)
  const permissionRead = usePermission('clipboard-read')
  const permissionWrite = usePermission('clipboard-write')
  const isSupported = isClipboardApiSupported || legacy

  const [text, setText] = useState('')
  const [copied, setCopied] = useState(false)
  const [copyPending, setCopyPending] = useState(false)
  const { start: resetCopiedTimer } = useTimeoutFn(() => setCopied(false), copiedDuring, { immediate: false })

  const lastLegacyIdRef = useRef(0)
  const sourceRef = useRef(source)
  sourceRef.current = source
  const isSupportedRef = useRef(isSupported)
  isSupportedRef.current = isSupported
  const isClipboardApiSupportedRef = useRef(isClipboardApiSupported)
  isClipboardApiSupportedRef.current = isClipboardApiSupported
  const permissionReadRef = useRef(permissionRead)
  permissionReadRef.current = permissionRead
  const permissionWriteRef = useRef(permissionWrite)
  permissionWriteRef.current = permissionWrite

  const updateText = useCallback(async () => {
    let useLegacy = !(isClipboardApiSupportedRef.current && isAllowed(permissionReadRef.current))
    if (!useLegacy) {
      try {
        setText(await navigatorRef.current!.clipboard.readText())
      }
      catch {
        useLegacy = true
      }
    }
    if (useLegacy)
      setText(legacyRead())
  }, [])

  useEffect(() => {
    if (!(isSupported && read))
      return

    const update = () => {
      void updateText()
    }

    window.addEventListener('copy', update, { passive: true })
    window.addEventListener('cut', update, { passive: true })
    return () => {
      window.removeEventListener('copy', update)
      window.removeEventListener('cut', update)
    }
  }, [isSupported, read, updateText])

  const copy = useCallback(async (value?: ClipboardValue) => {
    const resolvedValue = value ?? sourceRef.current
    if (isSupportedRef.current && resolvedValue != null) {
      setCopyPending(true)
      let useLegacy = !(isClipboardApiSupportedRef.current && isAllowed(permissionWriteRef.current))

      if (!useLegacy) {
        try {
          const clipboardItem = createClipboardItem(resolvedValue, setText)
          await navigatorRef.current!.clipboard.write([clipboardItem])
        }
        catch {
          useLegacy = true
        }
      }

      if (useLegacy) {
        if (typeof resolvedValue === 'string') {
          setText(resolvedValue)
          legacyCopy(resolvedValue)
        }
        else {
          // For async functions in legacy mode, resolve and copy
          const currentId = ++lastLegacyIdRef.current
          const resolvedText = await resolvedValue()
          if (resolvedText != null && currentId === lastLegacyIdRef.current) {
            setText(resolvedText)
            legacyCopy(resolvedText)
          }
        }
      }

      setCopied(true)
      resetCopiedTimer()
      setCopyPending(false)
    }
  }, [resetCopiedTimer])

  return {
    isSupported,
    text,
    copied,
    copyPending,
    copy,
  }
}
