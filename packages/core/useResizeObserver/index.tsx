import type { ConfigurableWindow } from '@reause/shared'
import type { RefObject } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { unrefElement } from '../unrefElement'

/**
 * Element types accepted as observation targets. Upstream's `TargetElement` also includes Vue
 * component instances (`VueInstance`) — React refs hold DOM nodes directly, so there is no
 * equivalent here.
 */
export type TargetElement = HTMLElement | SVGElement | undefined | null

/**
 * A React ref object holding an element — the React-native replacement for upstream's
 * `ElementTarget` (in Vue semantics a `MaybeRef`, i.e. a value or a `{ current }` union). reause
 * binds DOM hooks to refs only: a plain element is not accepted, so callers hold the element in a
 * `useRef` and the hook reads it with `unrefElement`. React's `Ref<T>` also unions the callback
 * form (`RefCallback<T>`), which cannot be read synchronously, so it is deliberately excluded here.
 */
export type ElementTarget<T extends TargetElement = TargetElement>
  = RefObject<T | null>

/**
 * A single target or an array of targets —.
 */
export type ElementTargetOrArray<T extends TargetElement = TargetElement>
  = ElementTarget<T> | ElementTarget<T>[]

/**
 * Options for `useResizeObserver`: passthrough of the platform `ResizeObserverOptions` (e.g. `box`)
 * plus a custom `window` instance, e.g. working with iframes or in testing environments.
 */
export interface UseResizeObserverOptions extends ResizeObserverOptions, ConfigurableWindow {}

/**
 * Return of `useResizeObserver`. Upstream extends `Supportable` with a `ComputedRef<boolean>`; the
 * React port exposes a plain `boolean` state.
 */
export interface UseResizeObserverReturn {
  /**
   * Whether the current environment supports the `ResizeObserver` API. Starts `false` and settles
   * in a mount effect (SSR-safe).
   */
  isSupported: boolean
  /**
   * Disconnect the observer and stop tracking target changes. Calling it again is a no-op — the
   * hook does not restart after `stop()`.
   */
  stop: () => void
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
 * Map from @vueuse/core `useResizeObserver`
 * (`source/vueuse/packages/core/useResizeObserver/`).
 *
 * @example
 * const el = useRef<HTMLTextAreaElement | null>(null)
 * const [text, setText] = useState('')
 *
 * useResizeObserver(el, (entries) => {
 *   const { width, height } = entries[0].contentRect
 *   setText(`width: ${width}, height: ${height}`)
 * })
 */
export function useResizeObserver(
  target: ElementTargetOrArray,
  callback: ResizeObserverCallback,
  options: UseResizeObserverOptions = {},
): UseResizeObserverReturn {
  // Latest-value refs synced each render, so effects always observe with the
  // newest target/callback/options without re-observing on their identity.
  const targetRef = useRef(target)
  const callbackRef = useRef(callback)
  const optionsRef = useRef(options)
  targetRef.current = target
  callbackRef.current = callback
  optionsRef.current = options

  const observerRef = useRef<ResizeObserver | undefined>(undefined)
  const stoppedRef = useRef(false)
  const previousRef = useRef<{ window: Window | undefined, elements: Element[] } | undefined>(undefined)
  const [isSupported, setIsSupported] = useState(false)

  // Disconnect the current observer — shared by the re-observe path, the
  // unmount cleanup and `stop()`, so the disconnect logic lives in exactly
  // one place.
  const disconnect = useCallback(() => {
    observerRef.current?.disconnect()
    observerRef.current = undefined
  }, [])

  // Re-observe after every render when the resolved targets or window
  // changed (upstream: `watch(targets, ..., { immediate: true })`). Diffing
  // keeps unchanged renders from re-observing, since each observe()
  // re-delivers the observed sizes.
  useEffect(() => {
    if (stoppedRef.current)
      return

    const { window: customWindow, ...observerOptions } = optionsRef.current
    const win = customWindow ?? (typeof window === 'undefined' ? undefined : window)
    const supported = Boolean(win && 'ResizeObserver' in win)
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

    disconnect()

    if (supported && win) {
      // The constructor is reached through the resolved window so a custom
      // `window` option can provide its own; the global `ResizeObserver` var
      // is not a `Window` member in TS's DOM lib, hence the structural cast.
      const winWithObserver = win as unknown as { ResizeObserver: typeof ResizeObserver }
      const observer = new winWithObserver.ResizeObserver((entries, instance) => callbackRef.current(entries, instance))
      observerRef.current = observer
      for (const element of elements)
        observer.observe(element, observerOptions)
    }
  })

  // Disconnect on unmount (upstream: `tryOnScopeDispose(stop)`). Kept as a
  // separate mount-only effect so render-driven re-runs of the effect above
  // never disconnect an observer whose targets are unchanged, and so a
  // StrictMode remount keeps observing. `disconnect` is referentially stable
  // (empty `useCallback` deps), so this effect stays mount-only.
  useEffect(() => () => {
    disconnect()
  }, [disconnect])

  const stop = useCallback(() => {
    stoppedRef.current = true
    disconnect()
  }, [disconnect])

  return { isSupported, stop }
}
