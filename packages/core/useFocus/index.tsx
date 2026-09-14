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
 * (`source/vueuse/packages/core/useFocus/`). Reactive utility to track or set
 * the focus state of a DOM element. Listens to the target's `focus` / `blur` events and exposes the
 * state as the first element of a React tuple; calling `setFocused(true)` / `setFocused(false)`
 * focuses / blurs the target. As upstream, the setter itself only calls `focus()` / `blur()` on the
 * element — the state is then updated by the `focus` / `blur` events.
 *
 * React divergences:
 * - upstream returns `{ focused: WritableComputedRef<boolean> }`, so consumers
 *   read and write `focused.value`; reause returns the React tuple
 *   `[isFocused, setFocused]` (array destructuring, no `.value`) — read the
 *   state from element 0 and focus / blur the target with element 1
 *   (`Dispatch<SetStateAction<boolean>>`, so the functional updater
 *   `setFocused(prev => !prev)` is supported);
 * - upstream composes `useEventListener` + `computed` + `watch`; here the
 *   `focus` / `blur` listeners live in a `useEffect` that re-attaches when
 *   the resolved target changes, and upstream's immediate
 *   `watch(targetElement, …)` that applies `initialValue` becomes a mount /
 *   target-change effect. Options are read through latest-value refs, so the
 *   listeners and the setter stay stable and never re-subscribe (upstream
 *   reads the options once in setup);
 * - the target is during render (a React ref object (`RefObject`) holding the element), so SSR
 * renders the default `false` state without touching the DOM; a plain element, a getter and a
 * callback ref are not accepted.
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

  // resolve the target during render — a pure unwrap (the ref's `.current`
  // read), no DOM access — so SSR renders the bare default state
  const elementRef = useRef<HTMLElement | SVGElement | null | undefined>(undefined)
  const element = target ? unrefElement(target) : undefined
  elementRef.current = element

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
    const el = elementRef.current
    if (!el)
      return

    const listenerOptions = { passive: true }
    el.addEventListener('focus', onFocus, listenerOptions)
    el.addEventListener('blur', onBlur, listenerOptions)

    return () => {
      el.removeEventListener('focus', onFocus)
      el.removeEventListener('blur', onBlur)
    }
  }, [element, onFocus, onBlur])

  // mirror of upstream's writable `computed` setter: calling `setFocused(true)`
  // / `setFocused(false)` triggers `focus()` / `blur()` on the target. The
  // state itself is updated by the `focus` / `blur` events (upstream
  // behavior); the ref is kept in sync synchronously so reads in the same tick
  // are correct. The functional updater form resolves against that ref, like
  // `useState`'s setter.
  const setFocused = useCallback<Dispatch<SetStateAction<boolean>>>((action) => {
    const next = typeof action === 'function' ? action(isFocusedRef.current) : action
    const el = elementRef.current
    if (!next && isFocusedRef.current)
      el?.blur()
    else if (next && !isFocusedRef.current)
      el?.focus({ preventScroll: preventScrollRef.current })
  }, [])

  // mirror of upstream's immediate `watch(targetElement, …)`: apply
  // `initialValue` on mount and whenever the resolved target changes
  useEffect(() => {
    setFocused(initialValueRef.current)
  }, [element, setFocused])

  return [isFocused, setFocused]
}
