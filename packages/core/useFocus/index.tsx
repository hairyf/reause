import type { ConfigurableWindow } from '@reause/shared'
import type { Dispatch, RefObject, SetStateAction } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { unrefElement } from '../unrefElement'

export interface UseFocusOptions extends ConfigurableWindow {
  /**
   * Initial value. If set true, then focus will be set on the target
   *
   * @default false
   */
  initialValue?: boolean

  /**
   * Replicate the:focus-visible behavior of CSS
   *
   * @default false
   */
  focusVisible?: boolean

  /**
   * Prevent scrolling to the element when it is focused.
   *
   * @default false
   */
  preventScroll?: boolean
}

export type UseFocusReturn = readonly [
  /**
   * If read as true, then the element has focus. If read as false, then the element does not have
   * focus. This is the plain React state updated by the target's `focus` / `blur` events.
   */
  isFocused: boolean,
  /**
   * If set to true, then the element will be focused. If set to false, the element will be blurred.
   * Accepts the React functional updater (`setFocused(prev => !prev)`). As upstream, the assignment
   * itself only calls `focus()` / `blur()` on the element — the state is then updated by the
   * `focus` / `blur` events.
   */
  setFocused: Dispatch<SetStateAction<boolean>>,
]

/**
 * Map from @vueuse/core `useFocus`
 * (`source/vueuse/packages/core/useFocus/`).
 *
 * @example
 * const input = useRef<HTMLInputElement>(null)
 * const [isFocused, setFocused] = useFocus(input)
 *
 * setFocused(true) // focus the input
 * setFocused(false) // blur the input
 */
export function useFocus(
  target: RefObject<HTMLElement | SVGElement | null | undefined>,
  options: UseFocusOptions = {},
): UseFocusReturn {
  const { initialValue = false, focusVisible = false, preventScroll = false } = options

  const [isFocused, setIsFocused] = useState(false)
  const isFocusedRef = useRef(false)
  isFocusedRef.current = isFocused

  // options are read through latest-value refs by the stable listeners and
  // setter, so changing them never re-subscribes (upstream captures them in
  // setup and reads them once)
  const initialValueRef = useRef(initialValue)
  initialValueRef.current = initialValue
  const focusVisibleRef = useRef(focusVisible)
  focusVisibleRef.current = focusVisible
  const preventScrollRef = useRef(preventScroll)
  preventScrollRef.current = preventScroll

  // The resolved target is state, not a render-time ref read: a React ref is
  // only populated during commit, so `target.current` is always `null` on the
  // first render and never changes identity afterwards. Reading it during
  // render would freeze `element` at `undefined` forever (no re-render, so the
  // listeners below would never attach and `initialValue` would never apply).
  // The effect resolves the element after commit and stores it in state, which
  // re-renders once and lets the effects keyed on `element` run against the
  // real node.
  const [element, setElement] = useState<HTMLElement | SVGElement | null | undefined>(undefined)

  // latest-value ref of the target, so the effect re-resolves without taking a
  // dependency on the (possibly unstable) ref object identity
  const targetRef = useRef(target)
  targetRef.current = target

  useEffect(() => {
    setElement(unrefElement(targetRef.current))
  }, [target])

  // mirror of upstream's focus/blur listeners (bound via `useEventListener`
  // with passive options): re-attach whenever the resolved target changes.
  // The handler parameter is the generic `Event` so the same listener binds to
  // both `HTMLElement` and `SVGElement` targets.
  const onFocus = useCallback((event: Event) => {
    if (!focusVisibleRef.current || (event.target as HTMLElement)?.matches?.(':focus-visible')) {
      isFocusedRef.current = true
      setIsFocused(true)
    }
  }, [])

  const onBlur = useCallback(() => {
    isFocusedRef.current = false
    setIsFocused(false)
  }, [])

  useEffect(() => {
    if (!element)
      return

    const listenerOptions = { passive: true }
    element.addEventListener('focus', onFocus, listenerOptions)
    element.addEventListener('blur', onBlur, listenerOptions)

    return () => {
      element.removeEventListener('focus', onFocus)
      element.removeEventListener('blur', onBlur)
    }
  }, [element, onFocus, onBlur])

  // mirror of upstream's writable `computed` setter: calling `setFocused(true)`
  // / `setFocused(false)` triggers `focus()` / `blur()` on the target. The
  // state itself is updated by the `focus` / `blur` events (upstream
  // behavior); the ref is kept in sync synchronously so reads in the same tick
  // are correct. The functional updater form resolves against that ref, like
  // `useState`'s setter. Upstream's setter calls `focus()` / `blur()`
  // unconditionally (no already-focused guard), so this mirrors it exactly —
  // a redundant `focus()` on the focused element is a silent no-op, while the
  // guard would have swallowed a focus request whenever the tracked state had
  // drifted from the DOM (e.g. after a click moved focus elsewhere).
  const setFocused = useCallback<Dispatch<SetStateAction<boolean>>>((action) => {
    const next = typeof action === 'function' ? action(isFocusedRef.current) : action
    if (next)
      element?.focus({ preventScroll: preventScrollRef.current })
    else
      element?.blur()
  }, [element])

  // mirror of upstream's immediate `watch(targetElement, …)`: apply
  // `initialValue` on mount and whenever the resolved target changes. Runs
  // after the element state settles, so `setFocused(true)` reaches the real
  // node (upstream reads the already-mounted template ref here).
  useEffect(() => {
    setFocused(initialValueRef.current)
  }, [element, setFocused])

  return [isFocused, setFocused]
}
