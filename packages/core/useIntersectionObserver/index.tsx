import type { RefObject } from 'react'
import type { ElementTarget, ElementTargetOrArray } from '../useResizeObserver'
import { toArray } from '@reause/shared'
import { useCallback, useEffect, useRef, useState } from 'react'
import { unrefElement } from '../unrefElement'

/**
 * Options for `useIntersectionObserver`: the platform `IntersectionObserver` options
 * (`root`/`rootMargin`/`threshold`) plus `immediate` and a custom `window` instance, e.g. working
 * with iframes or in testing environments. The accepted target types
 * (`TargetElement`/`ElementTarget`/ `ElementTargetOrArray`) are shared with `useResizeObserver`.
 */
export interface UseIntersectionObserverOptions {
  /**
   * Custom `window` instance, e.g. working with iframes or in testing environments. Unlike
   * `ConfigurableWindow`, an explicit `null` is honored as-is: it disables observation entirely
   * (mirroring upstream's `window && 'IntersectionObserver' in window` support gate) — only an
   * omitted option falls back to the global `window`.
   */
  window?: Window | null
  /**
   * Start the IntersectionObserver immediately on creation.
   *
   * @default true
   */
  immediate?: boolean

  /**
   * The Element or Document whose bounds are used as the bounding box when testing for
   * intersection.
   */
  root?: ElementTarget | RefObject<Document | null>

  /**
   * A string which specifies a set of offsets to add to the root's bounding_box when calculating
   * intersections.
   */
  rootMargin?: string

  /**
   * Either a single number or an array of numbers between 0.0 and 1.
   * @default 0
   */
  threshold?: number | number[]
}

/**
 * Return of `useIntersectionObserver`, mirroring upstream's `Supportable & Pausable` shape: `{
 * isSupported, isActive, pause, resume, stop }`.
 */
export interface UseIntersectionObserverReturn {
  /**
   * Whether the current environment supports the `IntersectionObserver` API. Starts `false` and
   * settles in a mount effect (SSR-safe).
   */
  isSupported: boolean
  /**
   * Whether the observer is currently running. Starts from the `immediate` option (default `true`)
   * and turns `false` after `pause()` or `stop()`.
   */
  isActive: boolean
  /**
   * Pause observing and set `isActive` to `false`.
   */
  pause: () => void
  /**
   * Resume observing.
   */
  resume: () => void
  /**
   * Disconnect the observer and stop observing permanently. Calling it again is a no-op — the hook
   * does not restart after `stop()`.
   */
  stop: () => void
}

/**
 * then resolve every item down to an element through the shared `unrefElement`, dropping empty
 * slots (upstream filters with `notNullish`).
 */
function resolveTargets(target: ElementTargetOrArray): Element[] {
  const items = toArray(target)

  const elements: Element[] = []
  for (const item of items) {
    const element = unrefElement(item)
    if (element)
      elements.push(element)
  }
  return elements
}

/**
 * Map from @vueuse/core `useIntersectionObserver`
 * (`source/vueuse/packages/core/useIntersectionObserver/`).
 *
 * @example
 * const target = useRef<HTMLDivElement | null>(null)
 * const [targetIsVisible, setIsVisible] = useState(false)
 *
 * useIntersectionObserver(target, ([entry]) => {
 *   setIsVisible(entry?.isIntersecting || false)
 * })
 */
export function useIntersectionObserver(
  target: ElementTargetOrArray,
  callback: IntersectionObserverCallback,
  options: UseIntersectionObserverOptions = {},
): UseIntersectionObserverReturn {
  // Latest-value refs synced each render, so effects always observe with the
  // newest target/callback/options without re-observing on their identity.
  const targetRef = useRef(target)
  const callbackRef = useRef(callback)
  const optionsRef = useRef(options)
  targetRef.current = target
  callbackRef.current = callback
  optionsRef.current = options

  const observerRef = useRef<IntersectionObserver | undefined>(undefined)
  const stoppedRef = useRef(false)
  const previousRef = useRef<{
    window: Window | null | undefined
    elements: Element[]
    root: Element | Document | null | undefined
    rootMargin: string | undefined
  } | undefined>(undefined)
  const [isSupported, setIsSupported] = useState(false)
  // upstream: `isActive = shallowRef(immediate)`
  const [isActive, setIsActive] = useState(() => optionsRef.current.immediate ?? true)
  // read inside the no-deps effect (which intentionally re-runs every render)
  // without tripping exhaustive-deps
  const isActiveRef = useRef(isActive)
  isActiveRef.current = isActive

  // Re-observe after every render when the resolved targets, root, root
  // margin or window changed (upstream: `watch(..., { immediate: true })`).
  // Diffing keeps unchanged renders from recreating the observer.
  useEffect(() => {
    if (stoppedRef.current)
      return

    const {
      window: customWindow,
      root: rootOption,
      rootMargin: rootMarginOption,
      threshold = 0,
    } = optionsRef.current
    // `customWindow === undefined` (not a nullish coalesce) — an explicit
    // `window: null` stays null so the support gate below disables observation,
    // mirroring upstream's `window && 'IntersectionObserver' in window`.
    const win: Window | null | undefined = customWindow === undefined
      ? (typeof window === 'undefined' ? undefined : window)
      : customWindow
    const supported = Boolean(win && 'IntersectionObserver' in win)
    setIsSupported(supported)

    // paused (or `immediate: false` and not yet resumed): stay disconnected —
    // the previous inputs are kept so `resume()` diffing recreates the observer
    if (!isActiveRef.current)
      return

    const elements = resolveTargets(targetRef.current)
    const root: Element | Document | undefined = rootOption?.current ?? undefined
    const rootMargin = rootMarginOption
    const previous = previousRef.current
    const unchanged = Boolean(
      previous
      && previous.window === win
      && previous.elements.length === elements.length
      && previous.elements.every((element, index) => element === elements[index])
      && previous.root === root
      && previous.rootMargin === rootMargin
      && observerRef.current,
    )
    previousRef.current = { window: win, elements, root, rootMargin }

    if (unchanged)
      return

    observerRef.current?.disconnect()
    observerRef.current = undefined

    if (supported && win) {
      // The constructor is reached through the resolved window so a custom
      // `window` option can provide its own; the global `IntersectionObserver`
      // var is not a `Window` member in TS's DOM lib, hence the structural
      // cast.
      const winWithObserver = win as unknown as { IntersectionObserver: typeof IntersectionObserver }
      const observer = new winWithObserver.IntersectionObserver(
        (entries, instance) => callbackRef.current(entries, instance),
        {
          root: root ?? null,
          rootMargin,
          threshold,
        },
      )
      observerRef.current = observer
      for (const element of elements)
        observer.observe(element)
    }
  })

  // Disconnect on unmount (upstream: `tryOnScopeDispose(stop)`). Kept as a
  // separate mount-only effect so render-driven re-runs of the effect above
  // never disconnect an observer whose inputs are unchanged.
  useEffect(() => () => {
    observerRef.current?.disconnect()
    observerRef.current = undefined
  }, [])

  // upstream: `pause() { cleanup(); isActive = false }`
  const pause = useCallback(() => {
    observerRef.current?.disconnect()
    observerRef.current = undefined
    setIsActive(false)
  }, [])

  // upstream: `resume() { isActive = true }` — the watch over `isActive`
  // recreates the observer on the next committed render
  const resume = useCallback(() => {
    setIsActive(true)
  }, [])

  const stop = useCallback(() => {
    stoppedRef.current = true
    observerRef.current?.disconnect()
    observerRef.current = undefined
    setIsActive(false)
  }, [])

  return { isSupported, isActive, pause, resume, stop }
}
