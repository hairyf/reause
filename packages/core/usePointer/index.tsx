import type { ConfigurableWindow } from '@reause/shared'
import type { RefObject } from 'react'
import { useEffect, useState } from 'react'
import { unrefElement } from '../unrefElement'

/**
 * Pointer device type reported by `PointerEvent.pointerType`.
 */
export type PointerType = 'mouse' | 'touch' | 'pen'

export interface UsePointerState {
  x: number
  y: number
  pointerId: number
  pressure: number
  tiltX: number
  tiltY: number
  width: number
  height: number
  twist: number
  pointerType: PointerType | null
}

export interface UsePointerOptions extends ConfigurableWindow {
  /**
   * Pointer types that listen to.
   *
   * @default ['mouse', 'touch', 'pen']
   */
  pointerTypes?: PointerType[]

  /**
   * Initial values.
   */
  initialValue?: Partial<UsePointerState>

  /**
   * React ref object (`RefObject`) holding the element that listens to pointer events; a ref whose
   * `.current` is `null` disables listening, while an omitted target falls back to `window`.
   *
   * @default window
   */
  target?: RefObject<EventTarget | null | undefined>
}

export interface UsePointerReturn extends UsePointerState {
  isInside: boolean
}

const defaultState: UsePointerState = {
  x: 0,
  y: 0,
  pointerId: 0,
  pressure: 0,
  tiltX: 0,
  tiltY: 0,
  width: 0,
  height: 0,
  twist: 0,
  pointerType: null,
}

/**
 * Map from @vueuse/core `usePointer`
 * (`source/vueuse/packages/core/usePointer/`), which listens to
 * `pointerdown`/`pointermove`/`pointerup` on the `target` option (default `window`), picks the
 * pointer state from every event, and flips `isInside` back to `false` on
 * `pointerleave`/`pointercancel`. A `pointerTypes` filter skips the state update but still marks
 * `isInside`. Reactive pointer state.
 *
 * React divergences:
 * - the Vue refs returned by upstream become a plain object of plain values — read `x`, `y`,
 * `pressure`, `pointerType`... directly off the result;
 * - a self-contained mount `useEffect` that re-subscribes when the resolved `target`/`pointerTypes`
 * change and removes all listeners on unmount;
 * - `initialValue` is folded into the `useState` initializer, so SSR renders the defaults (`x: 0`,
 * `y: 0`..., `pointerType: null`, `isInside: false`) without touching `window`;
 * - `target` accepts a React ref object (`RefObject`) holding the event target; a ref whose
 * `.current` is `null` disables listening, while an omitted `target` falls back to the `window`
 * option (upstream `target = defaultWindow` plus `if (target)`).
 *
 * @param options - `pointerTypes` / `initialValue` / `target` plus a custom
 *   `window` instance (`ConfigurableWindow`) used when `target` is omitted,
 *   e.g. an iframe window or a test double; listeners rebind when it changes.
 *
 * @example
 * const { x, y, pressure, pointerType, isInside } = usePointer()
 */
export function usePointer(options: UsePointerOptions = {}): UsePointerReturn {
  const { pointerTypes, target, initialValue, window: win } = options

  const [state, setState] = useState<UsePointerState>(() => ({
    ...defaultState,
    ...initialValue,
  }))
  const [isInside, setIsInside] = useState(false)

  // `ConfigurableWindow` support: fall back to the global `window` on the client
  const instance = win ?? (typeof window === 'undefined' ? undefined : window)

  // dependency-tracking read: refs populate before effects run, so the first
  // render resolves `null` for the ref's `.current` — the effect below re-resolves
  // fresh and re-binds whenever the resolved target changes
  const trackedTarget = target === undefined ? instance : unrefElement(target)

  useEffect(() => {
    if (!trackedTarget)
      return

    const handler = (event: Event) => {
      setIsInside(true)
      const pointerEvent = event as PointerEvent
      if (pointerTypes && !pointerTypes.includes(pointerEvent.pointerType as PointerType))
        return

      setState({
        x: pointerEvent.x,
        y: pointerEvent.y,
        pointerId: pointerEvent.pointerId,
        pressure: pointerEvent.pressure,
        tiltX: pointerEvent.tiltX,
        tiltY: pointerEvent.tiltY,
        width: pointerEvent.width,
        height: pointerEvent.height,
        twist: pointerEvent.twist,
        pointerType: pointerEvent.pointerType as PointerType,
      })
    }
    const leave = () => setIsInside(false)

    const listenerOptions = { passive: true }
    trackedTarget.addEventListener('pointerdown', handler, listenerOptions)
    trackedTarget.addEventListener('pointermove', handler, listenerOptions)
    trackedTarget.addEventListener('pointerup', handler, listenerOptions)
    trackedTarget.addEventListener('pointerleave', leave, listenerOptions)
    trackedTarget.addEventListener('pointercancel', leave, listenerOptions)

    return () => {
      trackedTarget.removeEventListener('pointerdown', handler)
      trackedTarget.removeEventListener('pointermove', handler)
      trackedTarget.removeEventListener('pointerup', handler)
      trackedTarget.removeEventListener('pointerleave', leave)
      trackedTarget.removeEventListener('pointercancel', leave)
    }
  }, [pointerTypes, trackedTarget])

  return { ...state, isInside }
}
