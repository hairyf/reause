import type { ConfigurableWindow } from '@reause/shared'
import type { RefObject } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { unrefElement } from '../unrefElement'

/**
 * Default `MutationObserverInit` used when `observeMutation` is enabled as a plain boolean —
 * mirrors upstream's `{ childList: true, subtree: true, characterData: true }`. Module-level so the
 * identity is stable across renders (the observer effect reconciles against it).
 */
const DEFAULT_MUTATION_OPTIONS: MutationObserverInit = {
  childList: true,
  subtree: true,
  characterData: true,
}

/**
 * Options for `useElementOverflow`: `observeMutation` optionally turns on a `MutationObserver`
 * (with a custom `MutationObserverInit`), `onUpdated` is called whenever an observer fires, and
 * `window` allows a custom `window` instance, e.g. working with iframes or in testing environments.
 */
export interface UseElementOverflowOptions extends ConfigurableWindow {
  /**
   * Use MutationObserver to observe the target and its children. Captured once on mount — later
   * changes are ignored (upstream destructures it once at setup too).
   *
   * @default false
   */
  observeMutation?: boolean | MutationObserverInit
  /**
   * Callback when observer triggered.
   */
  onUpdated?: ResizeObserverCallback | MutationCallback
}

/**
 * Return of `useElementOverflow`. Upstream exposes `shallowReadonly` refs for the overflow flags;
 * the React port exposes plain `boolean` state. `stop` and `update` match the upstream member
 * structure.
 */
export interface UseElementOverflowReturn {
  /**
   * Whether the element's content overflows in the horizontal direction.
   */
  isXOverflowed: boolean
  /**
   * Whether the element's content overflows in the vertical direction.
   */
  isYOverflowed: boolean
  /**
   * Stop observing. Disconnects the observers; the hook does not restart after `stop()`.
   */
  stop: () => void
  /**
   * Re-check the overflow state immediately.
   */
  update: () => void
}

/**
 * Reactive element's overflow state — React port of VueUse's `useElementOverflow`.
 *
 * Map from @vueuse/core `useElementOverflow`
 * (`source/vueuse/packages/core/useElementOverflow/`). Tracks whether an
 * element's content overflows its box in the x/y directions by comparing
 * `scrollWidth`/`scrollHeight` against `offsetWidth`/`offsetHeight` whenever the element or its
 * children resize and, with `observeMutation`, whenever its DOM content mutates.
 *
 * React divergences:
 * - `stop`/`update` keep the upstream member structure;
 * - `target` accepts a React ref object (`RefObject`) holding the element; a plain element, a
 * getter and a callback ref are not accepted. SVG elements are ignored;
 * - upstream's `useResizeObserver`/`useMutationObserver` composition becomes a
 *   self-contained observer effect that re-resolves the target plus its
 *   `HTMLElement` children after every render and reconciles the observers —
 *   the `ResizeObserver` is rebuilt only when the resolved element set or the
 *   `window` option changed (unchanged renders never disconnect a live
 *   observer, so pending deliveries are not dropped), while `observeMutation`
 *   is captured once at mount — upstream destructures it once at setup, so
 *   later changes (boolean flips or swapped init objects) are ignored and
 *   `stop()` is the way to halt observation;
 * - the Vue component/directive variants (`UseElementOverflow`,
 *   `vElementOverflow`) are not ported — they have no React equivalents;
 * - SSR-safe: nothing touches `window` during render, and `update()` no-ops
 *   without an element or a window.
 *
 * @param target - React ref object (`RefObject`) holding the element to
 *   watch for overflow, resolved with the shared `unrefElement`
 * @param option - `observeMutation` (default `false`, or a
 *   `MutationObserverInit` object) and `onUpdated`, plus a custom `window`
 *   instance
 * @example
 * const el = useRef<HTMLDivElement | null>(null)
 * const { isXOverflowed } = useElementOverflow(el)
 */
export function useElementOverflow(
  target: RefObject<Element | null | undefined>,
  option: UseElementOverflowOptions = {},
): UseElementOverflowReturn {
  // Latest-value refs synced each render, so the observer effect always
  // reconciles against the newest target/options.
  const targetRef = useRef(target)
  const optionsRef = useRef(option)
  targetRef.current = target
  optionsRef.current = option

  const [isXOverflowed, setIsXOverflowed] = useState(false)
  const [isYOverflowed, setIsYOverflowed] = useState(false)
  const stoppedRef = useRef(false)
  const resizeObserverRef = useRef<ResizeObserver | undefined>(undefined)
  const mutationObserverRef = useRef<MutationObserver | undefined>(undefined)
  const previousRef = useRef<{ window: Window | undefined, elements: Element[] } | undefined>(undefined)
  // upstream destructures `observeMutation` once at setup — capture the first
  // value and ignore later option changes (`stop()` halts observation); this
  // also keeps boolean flips and swapped init objects from half-reacting
  const observeMutationRef = useRef(option.observeMutation)

  // upstream `targetEl` computed: resolve the target, ignoring SVG elements
  const resolveTargetElement = useCallback((): HTMLElement | undefined => {
    const el = unrefElement(targetRef.current)
    if (!el || !(el instanceof HTMLElement))
      return undefined
    return el
  }, [])

  // upstream `targets` computed: the element plus its HTMLElement children
  const resolveTargets = useCallback((): Element[] => {
    const el = resolveTargetElement()
    if (!el)
      return []
    return [el, ...Array.from(el.children).filter((child): child is HTMLElement => child instanceof HTMLElement)]
  }, [resolveTargetElement])

  // upstream's internal `update(htmlEl)`: re-measure the overflow state
  const measure = useCallback((htmlEl: HTMLElement) => {
    setIsXOverflowed(htmlEl.scrollWidth > htmlEl.offsetWidth)
    setIsYOverflowed(htmlEl.scrollHeight > htmlEl.offsetHeight)
  }, [])

  // Resolve the effective window (upstream: `window = defaultWindow`). An
  // explicit falsy custom window means "no window" — observers never attach
  // and `update()` no-ops.
  const resolveWindow = useCallback((): Window | undefined => {
    const custom = optionsRef.current.window
    if (custom !== undefined)
      return custom
    return typeof window === 'undefined' ? undefined : window
  }, [])

  // upstream: `useResizeObserver(targets, ...)` + optional
  // `useMutationObserver(targets, ...)`, both wired to `update(el)`. Runs
  // after every render and reconciles the observers against the resolved
  // targets and the current options.
  useEffect(() => {
    if (stoppedRef.current)
      return

    const observeMutation = observeMutationRef.current
    const win = resolveWindow()
    if (!win)
      return

    const elements = resolveTargets()
    const previous = previousRef.current
    const unchanged = Boolean(
      previous
      && previous.window === win
      && previous.elements.length === elements.length
      && previous.elements.every((element, index) => element === elements[index]),
    )
    previousRef.current = { window: win, elements }

    if (!unchanged) {
      resizeObserverRef.current?.disconnect()
      resizeObserverRef.current = undefined
      mutationObserverRef.current?.disconnect()
      mutationObserverRef.current = undefined
    }

    if (!resizeObserverRef.current && 'ResizeObserver' in win) {
      // The constructor is reached through the resolved window so a custom
      // `window` option can provide its own; the global `ResizeObserver` var
      // is not a `Window` member in TS's DOM lib, hence the structural cast.
      const winWithObserver = win as unknown as { ResizeObserver: typeof ResizeObserver }
      const observer = new winWithObserver.ResizeObserver((entries, instance) => {
        const el = resolveTargetElement()
        if (el)
          measure(el)
        const onUpdated = optionsRef.current.onUpdated as ResizeObserverCallback | undefined
        onUpdated?.(entries, instance)
      })
      resizeObserverRef.current = observer
      for (const element of elements)
        observer.observe(element)
    }

    const wantMutation = Boolean(observeMutation && 'MutationObserver' in win)
    if (wantMutation && !mutationObserverRef.current) {
      const mutationOptions = typeof observeMutation === 'object'
        ? observeMutation
        : DEFAULT_MUTATION_OPTIONS
      const winWithObserver = win as unknown as { MutationObserver: typeof MutationObserver }
      const observer = new winWithObserver.MutationObserver((mutations, instance) => {
        const el = resolveTargetElement()
        if (el)
          measure(el)
        const onUpdated = optionsRef.current.onUpdated as MutationCallback | undefined
        onUpdated?.(mutations, instance)
      })
      mutationObserverRef.current = observer
      for (const element of elements)
        observer.observe(element, mutationOptions)
    }
    else if (!wantMutation && mutationObserverRef.current) {
      mutationObserverRef.current.disconnect()
      mutationObserverRef.current = undefined
    }
  })

  // Disconnect the observers on unmount (upstream: `tryOnScopeDispose(stop)`).
  // Kept as a separate mount-only effect so render-driven re-runs of the
  // effect above never disconnect an observer whose targets are unchanged.
  useEffect(() => () => {
    resizeObserverRef.current?.disconnect()
    resizeObserverRef.current = undefined
    mutationObserverRef.current?.disconnect()
    mutationObserverRef.current = undefined
  }, [])

  const stop = useCallback(() => {
    stoppedRef.current = true
    resizeObserverRef.current?.disconnect()
    resizeObserverRef.current = undefined
    mutationObserverRef.current?.disconnect()
    mutationObserverRef.current = undefined
  }, [])

  // upstream's public `update`: re-check the overflow state immediately. No
  // stop guard — like upstream, `update()` keeps re-measuring after `stop()`
  // (only the observers stop).
  const update = useCallback(() => {
    const el = resolveTargetElement()
    const win = resolveWindow()
    if (el && win)
      measure(el)
  }, [measure, resolveTargetElement, resolveWindow])

  return {
    isXOverflowed,
    isYOverflowed,
    stop,
    update,
  }
}
