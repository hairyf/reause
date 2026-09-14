import type { ConfigurableWindow } from '@reause/shared'
import type { ElementTargetOrArray } from '../useResizeObserver'
import { useCallback, useEffect, useRef, useState } from 'react'
import { unrefElement } from '../unrefElement'

/**
 * Target types accepted by `useMutationObserver` (`ElementTarget` / `ElementTargetOrArray`, backed
 * by `TargetElement`) are the canonical React-native definitions shared from `./useResizeObserver`
 * (single source of truth; the previous duplicate local copies were consolidated in the #462
 * audit).
 */

/**
 * Options for `useMutationObserver`: passthrough of the platform `MutationObserverInit` (e.g.
 * `attributes`, `childList`, `subtree`) plus a custom `window` instance, e.g. working with iframes
 * or in testing environments.
 */
export interface UseMutationObserverOptions extends MutationObserverInit, ConfigurableWindow {}

/**
 * Return of `useMutationObserver`. Upstream extends `Supportable` with a `ComputedRef<boolean>`;
 * the React port exposes a plain `boolean` state.
 */
export interface UseMutationObserverReturn {
  /**
   * Whether the current environment supports the `MutationObserver` API. Starts `false` and settles
   * in a mount effect (SSR-safe).
   */
  isSupported: boolean
  /**
   * Stop observing. Disconnects the observer and stops tracking target changes. Calling it again is
   * a no-op — the hook does not restart after `stop()`.
   */
  stop: () => void
  /**
   * Return all pending mutations records that have not yet been delivered to the callback, then
   * clear them. Returns `undefined` when no observer is active — no target resolved yet, or after
   * `stop()`.
   */
  takeRecords: () => MutationRecord[] | undefined
}

/**
 * dropping empty slots (upstream filters at observe time with `if (_el)`).
 */
function resolveTargets(target: ElementTargetOrArray): Element[] {
  const items = Array.isArray(target) ? target : [target]

  const elements: Element[] = []
  for (const item of items) {
    const element = unrefElement(item)
    if (element)
      elements.push(element)
  }
  return elements
}

/**
 * Map from @vueuse/core `useMutationObserver`
 * (`source/vueuse/packages/core/useMutationObserver/`).
 *
 * @see https://vueuse.org/core/useMutationObserver/
 * @see https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver
 * @example
 * const el = useRef<HTMLDivElement | null>(null)
 * const [attributes, setAttributes] = useState<string[]>([])
 *
 * useMutationObserver(el, (mutations) => {
 *   if (mutations[0])
 *     setAttributes(prev => [...prev, mutations[0].attributeName!])
 * }, { attributes: true })
 */
export function useMutationObserver(
  target: ElementTargetOrArray,
  callback: MutationCallback,
  options: UseMutationObserverOptions = {},
): UseMutationObserverReturn {
  // Latest-value refs synced each render, so the effect always observes with
  // the newest target/options without re-observing on their identity. The
  // callback is different: upstream pins it when the observer is constructed
  // (`new MutationObserver(callback)`), so a new callback alone does not
  // rebuild the observer — `callbackRef` is only re-read on a rebuild.
  const targetRef = useRef(target)
  const callbackRef = useRef(callback)
  const optionsRef = useRef(options)
  targetRef.current = target
  callbackRef.current = callback
  optionsRef.current = options

  const observerRef = useRef<MutationObserver | undefined>(undefined)
  const stoppedRef = useRef(false)
  const previousRef = useRef<{ window: Window | undefined, elements: Element[] } | undefined>(undefined)
  const [isSupported, setIsSupported] = useState(false)

  // Re-observe after every render when the resolved targets or window
  // changed (upstream: `watch(targets, ..., { immediate: true })`). Diffing
  // keeps unchanged renders from re-observing, so a disconnect never drops
  // mutation records that are still queued for delivery.
  useEffect(() => {
    if (stoppedRef.current)
      return

    const { window: customWindow, ...mutationOptions } = optionsRef.current
    const win = customWindow ?? (typeof window === 'undefined' ? undefined : window)
    const supported = Boolean(win && 'MutationObserver' in win)
    setIsSupported(supported)

    const elements = resolveTargets(targetRef.current)
    const previous = previousRef.current
    const unchanged = Boolean(
      previous
      && previous.window === win
      && previous.elements.length === elements.length
      && previous.elements.every((element, index) => element === elements[index])
      && observerRef.current,
    )
    previousRef.current = { window: win, elements }

    if (unchanged)
      return

    observerRef.current?.disconnect()
    observerRef.current = undefined

    if (supported && win && elements.length) {
      // The constructor is reached through the resolved window so a custom
      // `window` option can provide its own; the global `MutationObserver`
      // var is not a `Window` member in TS's DOM lib, hence the structural
      // cast. An empty target set never builds an observer (upstream:
      // `if (isSupported.value && newTargets.size)`), so `takeRecords()`
      // stays `undefined` while nothing is observed.
      const winWithObserver = win as unknown as { MutationObserver: typeof MutationObserver }
      // Upstream pins the callback at construction; it is only re-read when
      // the observer is rebuilt after a target/`window` change.
      const observer = new winWithObserver.MutationObserver(callbackRef.current)
      observerRef.current = observer
      for (const element of elements)
        observer.observe(element, mutationOptions)
    }
  })

  // Disconnect on unmount (upstream: `tryOnScopeDispose(stop)`). Kept as a
  // separate mount-only effect so render-driven re-runs of the effect above
  // never disconnect an observer whose targets are unchanged, and so a
  // StrictMode remount keeps observing.
  useEffect(() => () => {
    observerRef.current?.disconnect()
    observerRef.current = undefined
  }, [])

  const stop = useCallback(() => {
    stoppedRef.current = true
    observerRef.current?.disconnect()
    observerRef.current = undefined
  }, [])

  const takeRecords = useCallback(() => {
    return observerRef.current?.takeRecords()
  }, [])

  return { isSupported, stop, takeRecords }
}
