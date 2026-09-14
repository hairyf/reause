import { useRef } from 'react'
import { useEventListener } from '../useEventListener'

/**
 * Check if the currently focused element is editable — `<input>`, `<textarea>` or a
 * `contenteditable` element.
 *
 * A single source of truth mirroring the upstream default (`onStartTyping`'s
 * `isFocusedElementEditable`), exported so it can be reused in custom `isFocusedElementEditable`
 * options.
 */
export function isFocusedElementEditable(): boolean {
  const { activeElement, body } = document

  if (!activeElement)
    return false

  // If not element has focus, we assume it is not editable, too.
  if (activeElement === body)
    return false

  // Assume <input> and <textarea> elements are editable.
  switch (activeElement.tagName) {
    case 'INPUT':
    case 'TEXTAREA':
      return true
  }

  // Check if any other focused element id editable.
  return activeElement.hasAttribute('contenteditable')
}

/**
 * Check whether the pressed key counts as a "typing" character — `A–Z`, `0–9` (main row and numpad)
 * without any Ctrl / Alt / Meta modifier held down. Bound to the legacy `keyCode` like upstream.
 *
 * Exported so it can be reused in custom `isTypedCharValid` options.
 */
export function isTypedCharValid({
  keyCode,
  metaKey,
  ctrlKey,
  altKey,
}: KeyboardEvent): boolean {
  if (metaKey || ctrlKey || altKey)
    return false

  // 0...9
  if ((keyCode >= 48 && keyCode <= 57) || (keyCode >= 96 && keyCode <= 105))
    return true

  // A...Z
  if (keyCode >= 65 && keyCode <= 90)
    return true

  // All other keys.
  return false
}

/**
 * Options for `useStartTyping`.
 *
 * The upstream `ConfigurableDocument` is inlined as `document` here (see `useActiveElement` /
 * `useScriptTag` — `ConfigurableDocument` is not ported to `@reause/shared`).
 */
export interface UseStartTypingOptions {
  /**
   * Custom `document` instance to listen on, e.g. working with iframes or in testing environments.
   *
   * @default the global `document` on the client
   */
  document?: Document

  /**
   * Validate the pressed key before firing the callback.
   *
   * @default `isTypedCharValid`
   */
  isTypedCharValid?: (event: KeyboardEvent) => boolean

  /**
   * Decide whether the currently focused element counts as editable — the callback never fires
   * while such an element has focus.
   *
   * @default `isFocusedElementEditable`
   */
  isFocusedElementEditable?: () => boolean
}

/**
 * Fires when users start typing on non-editable elements. Useful for auto-focusing an input field
 * when the user starts typing anywhere on the page.
 *
 * Map from @vueuse/core `onStartTyping`
 * (`source/vueuse/packages/core/onStartTyping/`). Registers a passive
 * `keydown` listener on the `document` and calls `callback(event)` whenever the currently focused
 * element is not editable and the pressed key is a valid typing character. Focus is considered
 * editable when it is an `<input>`, `<textarea>` or `contenteditable` element; a key is a valid
 * typing character when it is alphanumeric (`A–Z`, `0–9` incl. numpad) and no Ctrl / Alt / Meta
 * modifier is held. Both gates are configurable via options and also exported as standalone
 * utilities.
 *
 * React divergences:
 * - the returned value is the unmount function that removes the `keydown`
 *   listener (upstream returns nothing — its listeners live in the
 *   composition scope); the listener is also removed automatically on
 *   unmount;
 * - the callback and the option functions are read through latest-value
 *   refs, so re-rendering with new inline callbacks never re-subscribes and
 *   always fires the newest callback;
 * - the upstream `ConfigurableDocument` option is inlined as `document?` and
 *   the default resolves to the global `document` behind a `typeof document`
 *   guard, so rendering on the server is safe (nothing touches `document`
 *   during render).
 *
 * @example
 * const input = useRef<HTMLInputElement>(null)
 *
 * useStartTyping(() => {
 *   if (!input.current?.active)
 *     input.current?.focus()
 * })
 *
 * @see https://vueuse.org/onStartTyping
 * @param callback Fired when the user starts typing on a non-editable element.
 * @param options
 * @returns An unmount function that stops listening to typing events.
 */
export function useStartTyping(
  callback: (event: KeyboardEvent) => void,
  options: UseStartTypingOptions = {},
): () => void {
  const {
    document: doc,
    isTypedCharValid: isTypedCharValidFn = isTypedCharValid,
    isFocusedElementEditable: isFocusedElementEditableFn = isFocusedElementEditable,
  } = options

  // latest-value refs synced each render so the mount-bound listener always
  // reads the newest callback / gate functions (stable listener identity)
  const callbackRef = useRef(callback)
  callbackRef.current = callback
  const gatesRef = useRef({ isTypedCharValid: isTypedCharValidFn, isFocusedElementEditable: isFocusedElementEditableFn })
  gatesRef.current = { isTypedCharValid: isTypedCharValidFn, isFocusedElementEditable: isFocusedElementEditableFn }

  const keydown = (event: KeyboardEvent) => {
    const { isTypedCharValid: valid, isFocusedElementEditable: editable } = gatesRef.current
    if (!editable() && valid(event))
      callbackRef.current(event)
  }

  // a plain target (not a getter): `useEventListener` resolves it during
  // render and re-binds whenever the resolved document changes, and the
  // `typeof document` guard keeps SSR safe
  return useEventListener<KeyboardEvent>(
    { current: doc ?? (typeof document === 'undefined' ? undefined : document) },
    'keydown',
    keydown,
    { passive: true },
  ) as () => void
}
