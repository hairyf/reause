import type { ConfigurableWindow } from '@reause/shared'
import type { RefObject } from 'react'
import { isIOS, noop } from '@reause/shared'
import { useCallback, useEffect, useRef } from 'react'
import { unrefElement } from '../unrefElement'
import { useEventListener } from '../useEventListener'

export interface UseClickOutsideOptions<Controls extends boolean = false> extends ConfigurableWindow {
  /**
   * List of elements that should not trigger the event, provided as elements or CSS Selectors.
   */
  ignore?: (Element | string)[]
  /**
   * Use capturing phase for the internal event listener.
   *
   * @default true
   */
  capture?: boolean
  /**
   * Run the handler function if focus moves to an iframe.
   *
   * @default false
   */
  detectIframe?: boolean
  /**
   * Expose more controls. When `true` the return is a `{ stop, cancel, trigger }` object instead of
   * a single stop function: `cancel()` suppresses the next click and `trigger(event)` force-fires
   * the handler.
   *
   * @default false
   */
  controls?: Controls
}

export type UseClickOutsideHandler = (event: PointerEvent | FocusEvent) => void

export interface UseClickOutsideControls {
  /**
   * Remove all registered event listeners.
   */
  stop: () => void
  /**
   * Suppress the next click that reaches the handler.
   */
  cancel: () => void
  /**
   * Force-fire the handler with the given event.
   */
  trigger: (event: Event) => void
}

export type UseClickOutsideReturn<Controls extends boolean = false> = Controls extends true
  ? UseClickOutsideControls
  : () => void

let _iOSWorkaround = false

/**
 * Listen for clicks outside of an element. Useful for modals or dropdowns.
 *
 * Map from @vueuse/core `onClickOutside`
 * (`source/vueuse/packages/core/onClickOutside/`). Attaches `click`,
 * `pointerdown` (and — when `detectIframe` is enabled — `blur`) listeners to the window, and calls
 * the handler when a click lands outside the resolved `target` element. The `ignore` option
 * suppresses the handler for matching elements (elements or CSS selectors), `capture` controls the
 * phase of the internal `click` listener (default `true`), and `detectIframe` also fires the
 * handler when focus moves to an iframe.
 *
 * React divergences:
 * - React has no composable-function API, so this is a hook: the listeners bind in effects;
 * - the target is a React ref object (`RefObject`); a plain element, getter or callback ref is not
 * accepted;
 * - the return is a single stop function (`() => void`) by default; with
 *   `controls: true` it is upstream's `{ stop, cancel, trigger }` object —
 *   `cancel()` suppresses the next click, `trigger(event)` force-fires the
 *   handler (and re-arms cancellation afterwards) and `stop()` removes every
 *   registered listener. All three are stable across renders;
 * - the target/handler/options are read through latest-value refs, so new
 *   inline targets or handlers never cause re-subscription — only changes to
 *   the resolved window, `capture` or the bound event options re-bind;
 * - SSR-safe: nothing touches `window` during render — the window target only resolves when
 * `window` is defined ands. The one-time iOS Safari click workaround also runs inside an effect
 * instead of during setup.
 *
 * @see https://vueuse.org/core/onClickOutside/
 *
 * @example
 * const target = useRef<HTMLDivElement | null>(null)
 * useClickOutside(target, (event) => console.log(event))
 *
 * const stop = useClickOutside(target, handler)
 * stop()
 *
 * const { cancel, trigger } = useClickOutside(target, handler, { controls: true })
 * cancel()
 * trigger(event)
 */
export function useClickOutside<T extends UseClickOutsideOptions>(
  target: RefObject<Element | null | undefined>,
  handler: UseClickOutsideHandler,
  options?: T,
): () => void

export function useClickOutside(
  target: RefObject<Element | null | undefined>,
  handler: UseClickOutsideHandler,
  options: UseClickOutsideOptions<true>,
): UseClickOutsideControls

export function useClickOutside(
  target: RefObject<Element | null | undefined>,
  handler: UseClickOutsideHandler,
  options: UseClickOutsideOptions<boolean> = {},
): UseClickOutsideReturn<boolean> {
  const {
    window: customWindow,
    ignore = [],
    capture = true,
    detectIframe = false,
    controls = false,
  } = options

  const defaultWindow = typeof window === 'undefined' ? undefined : window
  const win = customWindow ?? defaultWindow

  // Latest-value refs synced every render, so the bound listeners always read
  // the newest target / handler / options without re-subscribing on identity.
  const targetRef = useRef(target)
  const handlerRef = useRef(handler)
  const ignoreRef = useRef(ignore)
  const winRef = useRef(win)
  const boolRef = useRef({ detectIframe })
  targetRef.current = target
  handlerRef.current = handler
  ignoreRef.current = ignore
  winRef.current = win
  boolRef.current = { detectIframe }

  const shouldListenRef = useRef(true)
  const isProcessingClickRef = useRef(false)

  // Fixes: https://github.com/vueuse/vueuse/issues/1520
  // How it works: https://stackoverflow.com/a/39712411
  // One-time workaround so iOS Safari fires `click` on any element. These
  // handlers must not be disposed — kept for the whole page lifetime.
  useEffect(() => {
    const currentWindow = winRef.current
    if (!currentWindow || !isIOS || _iOSWorkaround)
      return
    _iOSWorkaround = true
    const listenerOptions = { passive: true }
    Array.from(currentWindow.document.body.children)
      .forEach(el => el.addEventListener('click', noop, listenerOptions))
    currentWindow.document.documentElement.addEventListener('click', noop, listenerOptions)
  }, [])

  const shouldIgnore = useCallback((event: Event): boolean => {
    const currentWindow = winRef.current
    if (!currentWindow)
      return false
    return ignoreRef.current.some((item) => {
      if (typeof item === 'string') {
        return Array.from(currentWindow.document.querySelectorAll(item))
          .some(el => el === event.target || event.composedPath().includes(el))
      }
      const el = item
      return !!el && (event.target === el || event.composedPath().includes(el))
    })
  }, [])

  const listener = useCallback((event: Event): void => {
    const el = unrefElement(targetRef.current)

    if (event.target == null)
      return

    if (!el || el === event.target || event.composedPath().includes(el))
      return

    // `detail === 0` marks a click that was pre-filtered by the pointerdown
    // listener (e.g. one that hit an ignored element) — keep it ignored.
    if ('detail' in event && event.detail === 0)
      shouldListenRef.current = !shouldIgnore(event)

    if (!shouldListenRef.current) {
      shouldListenRef.current = true
      return
    }

    handlerRef.current(event as PointerEvent | FocusEvent)
  }, [shouldIgnore])

  const stopClick = useEventListener(
    { current: win },
    'click',
    (event: Event) => {
      if (!isProcessingClickRef.current) {
        isProcessingClickRef.current = true
        setTimeout(() => {
          isProcessingClickRef.current = false
        }, 0)
        listener(event)
      }
    },
    { passive: true, capture },
  )

  const stopPointerDown = useEventListener(
    { current: win },
    'pointerdown',
    (e: PointerEvent) => {
      const el = unrefElement(targetRef.current)
      shouldListenRef.current = !shouldIgnore(e) && !!(el && !e.composedPath().includes(el))
    },
    { passive: true },
  )

  const stopBlur = useEventListener(
    { current: win },
    'blur',
    (event: FocusEvent) => {
      // `detectIframe` is read through a ref so the listener stays registered
      // without violating react-hooks/rules-of-hooks (no conditional hooks).
      if (!boolRef.current.detectIframe)
        return
      setTimeout(() => {
        const currentWindow = winRef.current
        if (!currentWindow)
          return
        const el = unrefElement(targetRef.current)
        let activeEl: Element | null | undefined = currentWindow.document.activeElement
        while (activeEl?.shadowRoot)
          activeEl = activeEl.shadowRoot.activeElement
        if (
          activeEl?.tagName === 'IFRAME'
          && !el?.contains(currentWindow.document.activeElement)
        ) {
          handlerRef.current(event as PointerEvent | FocusEvent)
        }
      }, 0)
    },
    { passive: true },
  )

  const cancel = useCallback(() => {
    shouldListenRef.current = false
  }, [])

  const trigger = useCallback((event: Event) => {
    shouldListenRef.current = true
    listener(event)
    shouldListenRef.current = false
  }, [listener])

  const stop = useCallback(() => {
    stopClick?.()
    stopPointerDown?.()
    stopBlur?.()
  }, [stopClick, stopPointerDown, stopBlur])

  if (controls) {
    // upstream returns noops for every control when there is no window
    if (!win)
      return { stop: noop, cancel: noop, trigger: noop }
    return { stop, cancel, trigger }
  }

  return stop
}
