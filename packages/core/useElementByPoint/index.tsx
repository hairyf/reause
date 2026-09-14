import type { Pausable } from '../useRafFn'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRafFn } from '../useRafFn'

export interface UseElementByPointOptions<Multiple extends boolean = false> {
  /**
   * X coordinate of the point to hit-test. A read-only value source — pass a plain number; resolve
   * a React ref or getter at the call site. The latest value is read on every scheduler tick.
   */
  x: number
  /**
   * Y coordinate of the point to hit-test. A read-only value source — pass a plain number; resolve
   * a React ref or getter at the call site. The latest value is read on every scheduler tick.
   */
  y: number
  /**
   * When enabled, return every element under the point (`document.elementsFromPoint`) instead of
   * the topmost one (`document.elementFromPoint`)
   *
   * @default false
   */
  multiple?: Multiple
  /**
   * Allow a custom `document` instance, e.g. working with iframes or in testing environments.
   *
   * @default the global `document` on the client, `undefined` during SSR
   */
  document?: Document
  /**
   * Custom scheduler driving the element updates. Called during render, so it must follow the Rules
   * of Hooks — pass it consistently across renders, e.g. `scheduler: cb => useRafFn(cb, { fpsLimit:
   * 30 })`.
   *
   * @default useRafFn
   */
  scheduler?: (cb: () => void) => Pausable
}

export interface UseElementByPointReturn<Multiple extends boolean = false> {
  /**
   * Whether `elementFromPoint` (or `elementsFromPoint` when `multiple` is enabled) is available in
   * the current browser. `false` during render and on the server, resolved in a mount effect.
   */
  isSupported: boolean
  /**
   * The element at the given point. `null` before the first tick (and when the point hits nothing).
   */
  element: Multiple extends true ? HTMLElement[] : HTMLElement | null
  /**
   * Whether the scheduler loop is currently active
   */
  isActive: boolean
  /**
   * Pause the element update loop
   */
  pause: () => void
  /**
   * Resume the element update loop
   */
  resume: () => void
}

type ElementByPointElement<M extends boolean> = M extends true ? HTMLElement[] : HTMLElement | null

/**
 * Reactive element by point.
 *
 * Map from @vueuse/core `useElementByPoint`
 * (`source/vueuse/packages/core/useElementByPoint/`), which hit-tests the
 * element under the `x` / `y` point with `document.elementFromPoint` (or
 * `document.elementsFromPoint` when `multiple` is enabled) on every scheduler tick — upstream
 * default `useRafFn`, so the element follows the coordinates live.
 *
 * React divergences:
 * - the Vue `ComputedRef<boolean>` `isSupported` becomes a plain boolean
 *   probed in an effect after every render (the repo's `useSupported` probe
 *   is one-shot, so it is not reused here) — flipping `multiple` or swapping
 *   `document` re-evaluates support, like upstream's computed; SSR-safe:
 *   `false` during render and until the first effect run;
 * - `x` and `y` are read-only value sources and take plain numbers. They are re-read on every tick
 * through latest-value refs, so e.g. a `useMouse` position updates the hit element without
 * re-running the hook; `multiple` stays a plain `Multiple` (a behavior toggle, not a value source);
 * - the `document` option is inlined and defaults to the global `document` only on the client, so
 * SSR renders never touch the DOM; a document missing `elementFromPoint`/`elementsFromPoint`
 * reports `isSupported: false` and the hit-test degrades to `null`/`[]` instead of throwing;
 * - the `scheduler` option is called during render to compose the update loop
 *   (Rules of Hooks) and defaults to `useRafFn`, mirroring upstream; its
 *   `Pausable` return type is imported from `useRafFn` (upstream sources it
 *   from `@vueuse/shared` — `useRafFn` re-exports the shared type).
 *
 * @see https://vueuse.org/core/useElementByPoint/
 * @param options - UseElementByPointOptions
 *
 * @example
 * const { x, y } = useMouse({ type: 'client' })
 * const { element } = useElementByPoint({ x, y })
 */
export function useElementByPoint<M extends boolean = false>(options: UseElementByPointOptions<M>): UseElementByPointReturn<M> {
  const {
    x,
    y,
    document: documentOption = typeof document === 'undefined' ? undefined : document,
    multiple,
    scheduler = useRafFn,
  } = options

  // Upstream `useSupported` is a computed re-evaluated when `multiple` or
  // `document` change; the repo's `useSupported` probe runs exactly once, so
  // probe here in an effect after every render instead — flipping `multiple`
  // or swapping `document` re-evaluates support. SSR-safe: `false` during
  // render and until the first effect run.
  const [isSupported, setIsSupported] = useState(false)
  useEffect(() => {
    if (multiple)
      setIsSupported(Boolean(documentOption && 'elementsFromPoint' in documentOption))
    else
      setIsSupported(Boolean(documentOption && 'elementFromPoint' in documentOption))
  })

  const [element, setElement] = useState<ElementByPointElement<M>>(null as ElementByPointElement<M>)

  // latest-value refs synced each render so the update callback always reads
  // the newest options (stable identity, no re-subscription on option-only
  // renders)
  const documentRef = useRef<Document | undefined>(documentOption)
  documentRef.current = documentOption
  const xRef = useRef(x)
  xRef.current = x
  const yRef = useRef(y)
  yRef.current = y
  const multipleRef = useRef(multiple)
  multipleRef.current = multiple

  const updateElement = useCallback(() => {
    const doc = documentRef.current
    const pointX = xRef.current
    const pointY = yRef.current

    if (multipleRef.current) {
      // guard a feature-absent document (the `isSupported` probe reports
      // false for it) so the hit-test degrades to an empty stack instead of
      // calling a missing `elementsFromPoint`
      const elements = doc && typeof doc.elementsFromPoint === 'function'
        ? doc.elementsFromPoint(pointX, pointY)
        : []
      setElement(elements as unknown as ElementByPointElement<M>)
    }
    else {
      const hit = doc && typeof doc.elementFromPoint === 'function'
        ? doc.elementFromPoint(pointX, pointY)
        : null
      setElement(hit as unknown as ElementByPointElement<M>)
    }
  }, [])

  const { isActive, pause, resume } = scheduler(updateElement)

  return {
    isSupported,
    element,
    isActive,
    pause,
    resume,
  }
}
