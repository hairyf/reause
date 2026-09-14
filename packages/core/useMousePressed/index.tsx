import type { ConfigurableWindow, State } from '@reause/shared'
import type { RefObject } from 'react'
import type { UseMouseSourceType } from '../useMouse'
import { useControllableState } from '@reause/shared'
import { useEffect, useRef, useState } from 'react'
import { unrefElement } from '../unrefElement'

export interface UseMousePressedOptions extends ConfigurableWindow {
  /**
   * Listen to `touchstart` `touchend` events
   *
   * @default true
   */
  touch?: boolean

  /**
   * Listen to `dragstart` `drop` and `dragend` events
   *
   * @default true
   */
  drag?: boolean

  /**
   * Add event listeners with the `capture` option set to `true` (see
   * [MDN](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener#capture))
   *
   * @default false
   */
  capture?: boolean

  /**
   * Initial values
   *
   * @default false
   */
  initialValue?: State<boolean>

  /**
   * Element target to be capture the click
   */
  target?: RefObject<EventTarget | null | undefined>

  /**
   * Callback to be called when the mouse is pressed
   *
   * @param event
   */
  onPressed?: (event: MouseEvent | TouchEvent | DragEvent) => void

  /**
   * Callback to be called when the mouse is released
   *
   * @param event
   */
  onReleased?: (event: MouseEvent | TouchEvent | DragEvent) => void
}

/** @deprecated use {@link UseMousePressedOptions} instead */
export type MousePressedOptions = UseMousePressedOptions

export interface UseMousePressedReturn {
  pressed: boolean
  sourceType: UseMouseSourceType
}

/**
 * Map from @vueuse/core `useMousePressed`
 * (`source/vueuse/packages/core/useMousePressed/`), which tracks a reactive
 * pressing state — `pressed` flips on `mousedown`/`touchstart` (optionally `dragstart`) on the
 * `target` option (default `window`) and back off on
 * `mouseup`/`mouseleave`/`touchend`/`touchcancel` (optionally `drop`/ `dragend`) on `window`,
 * recording the `sourceType` of the press.
 *
 * - the Vue `pressed`/`sourceType` shallow refs become plain values in a
 *   `{ pressed, sourceType }` object backed by React state;
 * - a self-contained mount `useEffect` that re-subscribes when `target`/`capture`/`drag`/`touch`
 * change and removes all listeners on unmount;
 * - `onPressed`/`onReleased` are read through a latest-value ref, so the
 *   listeners always call the newest callbacks without re-binding on renders;
 * - `target` accepts a React ref object (`RefObject`) holding the element (React equivalent of
 * `MaybeRefOrGetter`). It is re-resolved on every render and the listeners re-bind when the
 * resolved element changes; a plain element, a getter and a callback ref are not accepted;
 * - SSR-safe: nothing touches `window` during render — only, and `initialValue` seeds `useState` so
 * SSR renders the same initial state.
 *
 * @example
 * const { pressed, sourceType } = useMousePressed()
 */
export function useMousePressed(options: UseMousePressedOptions = {}): UseMousePressedReturn {
  const {
    touch = true,
    drag = true,
    capture = false,
    initialValue = false,
    window: win,
  } = options

  const [pressed, setPressed] = useControllableState(initialValue, { passive: true })
  const [sourceType, setSourceType] = useState<UseMouseSourceType>(null)

  // latest-value ref synced each render so the listeners registered in the
  // mount effect always read the newest options (stable handler identities)
  const optionsRef = useRef(options)
  optionsRef.current = options

  // dependency-tracking read: refs populate before effects run, so the first
  // render reports `null` for the ref's `.current` — the effect below re-resolves
  // fresh and re-binds whenever the resolved element changes
  const trackedTarget = options.target

  useEffect(() => {
    // upstream `defaultWindow`: only an `undefined` window falls back to the
    // global one (SSR-safe); an explicit falsy `window` (e.g. `null`, as
    // `iframe.contentWindow` can be) is inert and attaches no listeners
    const instance = win !== undefined
      ? win
      : (typeof window === 'undefined' ? undefined : window)
    if (!instance)
      return

    const target = (optionsRef.current.target ? unrefElement(optionsRef.current.target) : undefined) ?? instance
    const listenerOptions: AddEventListenerOptions = { passive: true, capture }

    const onPressed = (srcType: UseMouseSourceType) => (event: MouseEvent | TouchEvent | DragEvent) => {
      setPressed(true)
      setSourceType(srcType)
      optionsRef.current.onPressed?.(event)
    }
    const onReleased = (event: MouseEvent | TouchEvent | DragEvent) => {
      setPressed(false)
      setSourceType(null)
      optionsRef.current.onReleased?.(event)
    }

    const listeners: Array<[EventTarget, string, EventListener]> = [
      [target, 'mousedown', onPressed('mouse') as EventListener],
      [instance, 'mouseleave', onReleased as EventListener],
      [instance, 'mouseup', onReleased as EventListener],
    ]

    if (drag) {
      listeners.push(
        [target, 'dragstart', onPressed('mouse') as EventListener],
        [instance, 'drop', onReleased as EventListener],
        [instance, 'dragend', onReleased as EventListener],
      )
    }

    if (touch) {
      listeners.push(
        [target, 'touchstart', onPressed('touch') as EventListener],
        [instance, 'touchend', onReleased as EventListener],
        [instance, 'touchcancel', onReleased as EventListener],
      )
    }

    listeners.forEach(([el, type, handler]) => el.addEventListener(type, handler, listenerOptions))

    return () => {
      listeners.forEach(([el, type, handler]) => el.removeEventListener(type, handler, listenerOptions))
    }
  }, [trackedTarget, capture, drag, touch, win])

  return { pressed, sourceType }
}
