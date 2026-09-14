import type { ConfigurableWindow } from '@reause/shared'
import type { RefObject } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { unrefElement } from '../unrefElement'

export interface UseElementHoverOptions extends ConfigurableWindow {
  /**
   * Delay in milliseconds before the hover state is set to `true`
   *
   * @default 0
   */
  delayEnter?: number

  /**
   * Delay in milliseconds before the hover state is set to `false`
   *
   * @default 0
   */
  delayLeave?: number

  /**
   * Whether to set the hover state to `false` when the element is removed from the DOM
   *
   * @default false
   */
  triggerOnRemoval?: boolean
}

/**
 * Reactive element's hover state.
 *
 * Map from @vueuse/core `useElementHover`
 * (`source/vueuse/packages/core/useElementHover/`), which attaches
 * `mouseenter` / `mouseleave` listeners to the target element and reports whether the pointer
 * currently hovers it. `delayEnter` / `delayLeave` defer the state flip with a debounced timer (a
 * new event cancels any pending one), and `triggerOnRemoval` forces the state back to `false` when
 * the element is removed from the DOM.
 *
 * React divergences:
 * - upstream's `ShallowRef<boolean>` return becomes a plain boolean backed by
 *   React state, so the hook reads as `const isHovered = useElementHover(el)`;
 * - `target` accepts a React ref object (`RefObject`) holding the element (the React analog of
 * upstream's `MaybeRefOrGetter`); it is re-resolved on every render and re-bound whenever the
 * resolved element changes, so a `useRef` target that is `null` during the first render still
 * starts tracking once React attaches the element.
 * - the upstream `useEventListener` composition is inlined in a mount `useEffect`, and the
 * `triggerOnRemoval` `onElementRemoval` watcher is inlined as a `MutationObserver` on `document`;
 * listeners and the observer;
 * - all options are read live, uniformly: `delayEnter` / `delayLeave` are
 *   re-read on every event through latest-value refs, and `triggerOnRemoval`
 *   re-binds the removal observer when it changes — upstream freezes all
 *   three during setup (an intentional divergence, kept consistent across
 *   the options);
 * - `window: null` disables tracking entirely (no listeners, the state stays `false`); an omitted
 * `window` falls back to the global `window` only on the client;
 * - SSR-safe: nothing touches `window` or the DOM during render — listeners
 *   attach in the mount effect only and the initial state is always `false`.
 *
 * @param target - React ref object (`RefObject`) holding the element whose
 *   hover state is tracked, resolved with the shared `unrefElement`
 * @param options - `delayEnter` / `delayLeave` (default `0`),
 *   `triggerOnRemoval` (default `false`) and a custom `window` instance
 *   (`null` disables tracking)
 *
 * @example
 * const el = useRef<HTMLButtonElement>(null)
 * const isHovered = useElementHover(el, { delayEnter: 200, delayLeave: 600 })
 */
export function useElementHover(
  target: RefObject<EventTarget | null | undefined>,
  options: UseElementHoverOptions = {},
): boolean {
  const {
    triggerOnRemoval = false,
    window: win,
  } = options

  const [isHovered, setIsHovered] = useState(false)

  // latest-value refs synced each render so the effect always reads the newest
  // target / options (stable handler identities, no re-bind on renders)
  const targetRef = useRef(target)
  targetRef.current = target
  const optionsRef = useRef(options)
  optionsRef.current = options

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // upstream `toggle`: a new event cancels any pending delay timer, then the
  // state flips immediately or after `delayEnter` / `delayLeave`
  const toggle = useCallback((entering: boolean) => {
    const { delayEnter: enter, delayLeave: leave } = optionsRef.current
    const delay = entering ? enter : leave

    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }

    if (delay) {
      timerRef.current = setTimeout(() => {
        timerRef.current = null
        setIsHovered(entering)
      }, delay)
    }
    else {
      setIsHovered(entering)
    }
  }, [])

  // upstream: `window = defaultWindow` — only an *omitted* option falls back
  // to the global window; an explicit falsy window (e.g. `null`) disables
  // tracking entirely (`if (!window) return isHovered` — no listeners attach)
  const instance = win === undefined ? (typeof window === 'undefined' ? undefined : window) : win

  // dependency-tracking read: refs populate before effects run, so the first
  // render reports `null` for the ref's `.current` — the effect below re-resolves
  // fresh and re-binds whenever the resolved element changes
  const trackedTarget = target

  useEffect(() => {
    if (!instance)
      return

    const el = unrefElement(targetRef.current)
    if (!el)
      return

    const listenerOptions: AddEventListenerOptions = { passive: true }
    const onEnter = () => toggle(true)
    const onLeave = () => toggle(false)

    el.addEventListener('mouseenter', onEnter, listenerOptions)
    el.addEventListener('mouseleave', onLeave, listenerOptions)

    // upstream `onElementRemoval`: observe `document` for child-list mutations
    // and force the hover state back to `false` once the element is detached
    let removalObserver: MutationObserver | null = null
    if (triggerOnRemoval && el instanceof Node && instance.document) {
      removalObserver = new MutationObserver(() => {
        if (!el.isConnected) {
          toggle(false)
          removalObserver?.disconnect()
        }
      })
      removalObserver.observe(instance.document, { childList: true, subtree: true })
    }

    return () => {
      el.removeEventListener('mouseenter', onEnter, listenerOptions)
      el.removeEventListener('mouseleave', onLeave, listenerOptions)
      removalObserver?.disconnect()
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [instance, trackedTarget, triggerOnRemoval, toggle])

  return isHovered
}
