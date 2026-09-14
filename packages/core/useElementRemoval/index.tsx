import type { ConfigurableWindow } from '@reause/shared'
import type { RefObject } from 'react'
import { useCallback, useEffect, useRef } from 'react'
import { unrefElement } from '../unrefElement'

/**
 * Options for `useElementRemoval`: the `document` (or open `ShadowRoot`) whose subtree is observed,
 * plus a custom `window` instance, e.g. working with iframes or in testing environments.
 */
export interface UseElementRemovalOptions extends ConfigurableWindow {
  /**
   * Custom `document` or open `ShadowRoot` to observe removals in, e.g. working with iframes or in
   * testing environments.
   *
   * @default the resolved `window`'s `document` on the client
   */
  document?: Document | ShadowRoot
}

/**
 * Return of `useElementRemoval`: the stop handle (upstream's `Fn`).
 */
export type UseElementRemovalReturn = () => void

/**
 * Fires when the element or any element containing it is removed.
 *
 * Map from @vueuse/core `onElementRemoval`
 * (`source/vueuse/packages/core/onElementRemoval/`). `callback` runs whenever
 * the target element — or any ancestor holding it — leaves the DOM; the `MutationRecord[]` that
 * reported the removal is passed to it verbatim, so one callback can cover a batch of removals
 * (upstream passes the whole delivered `mutationsList`, not just the matching records).
 *
 * React divergences:
 * - the Vue `watchEffect` over `unrefElement(target)` becomes an effect that
 *   runs after every render and reconciles the observer against the resolved
 *   `window`/`document`; unchanged renders never re-observe, so pending
 *   mutation records are not dropped on an unnecessary reconnect;
 * - upstream composes `useMutationObserver(document...)`, whose target is the document rather than
 * the element. This repo's `useMutationObserver` is typed for element targets, so the observer is
 * built here directly on the resolved `document` / `ShadowRoot` with `{ childList: true, subtree:
 * true }` — the same shape `useActiveElement` uses for its `triggerOnRemoval`;
 * - the target element is resolved at delivery time instead of at observer
 *   construction, so a ref that attaches after mount is tracked even without a
 *   re-render (upstream re-creates its observer whenever the element changes);
 * - `flush` (upstream defaults to `'sync'`) has no React equivalent — the
 *   observer is always attached in an effect and callbacks are delivered by the
 *   platform `MutationObserver`;
 * - `tryOnScopeDispose(stopHandle)` becomes an unmount effect that disconnects;
 *   the returned stop handle matches upstream, and calling it twice is a no-op
 *   — the hook does not restart after `stop()`;
 * - with no `window`/`document` (SSR, or an explicitly disabled `window`
 *   option) nothing is observed and the returned stop handle is inert, which is
 *   what upstream's `return noop` amounts to.
 *
 * SSR-safe: nothing touches `window` or the DOM during render — the observer is only created inside
 * an effect.
 *
 * @see https://vueuse.org/core/onElementRemoval/
 *
 * @param target - React ref object (`RefObject`) holding the element whose
 *   removal, or the removal of any element containing it, is reported,
 *   resolved with the shared `unrefElement`
 * @param callback - receives the `MutationRecord[]` that reported the removal
 * @param options - `document` / `window` overrides
 *
 * @example
 * const btnRef = useRef<HTMLButtonElement | null>(null)
 * const [removedCount, setRemovedCount] = useState(0)
 *
 * useElementRemoval(btnRef, () => setRemovedCount(count => count + 1))
 *
 * // later, stop observing
 * const stop = useElementRemoval(btnRef, callback)
 * stop()
 */
export function useElementRemoval(
  target: RefObject<Element | null | undefined>,
  callback: (mutationRecords: MutationRecord[]) => void,
  options: UseElementRemovalOptions = {},
): UseElementRemovalReturn {
  // Latest-value refs synced each render, so the effect below always
  // reconciles against the newest target/options without re-observing on their
  // identity.
  const targetRef = useRef(target)
  const callbackRef = useRef(callback)
  const optionsRef = useRef(options)
  targetRef.current = target
  callbackRef.current = callback
  optionsRef.current = options

  const observerRef = useRef<MutationObserver | undefined>(undefined)
  const stoppedRef = useRef(false)
  const previousRef = useRef<{ window: Window | undefined, document: Document | ShadowRoot | undefined } | undefined>(undefined)

  // Re-observe after every render when the resolved window/document changed
  // (upstream: `watchEffect` + `useMutationObserver`). Diffing keeps unchanged
  // renders from re-observing, so a disconnect never drops mutation records
  // that are still queued for delivery.
  useEffect(() => {
    if (stoppedRef.current)
      return

    // An explicit falsy custom `window` means "no window" — upstream's
    // destructuring default only fills in `undefined`, so it returns `noop`
    // instead of falling back to the global.
    const customWindow = optionsRef.current.window
    const win = customWindow !== undefined
      ? customWindow
      : (typeof window === 'undefined' ? undefined : window)
    const doc = optionsRef.current.document ?? win?.document

    const previous = previousRef.current
    const unchanged = Boolean(
      previous
      && previous.window === win
      && previous.document === doc
      && observerRef.current,
    )
    previousRef.current = { window: win, document: doc }

    if (unchanged)
      return

    observerRef.current?.disconnect()
    observerRef.current = undefined

    // upstream: `if (!window || !document) return noop`
    if (!win || !doc || !('MutationObserver' in win))
      return

    // The constructor is reached through the resolved window so a custom
    // `window` option can provide its own; the global `MutationObserver` var is
    // not a `Window` member in TS's DOM lib, hence the structural cast.
    const winWithObserver = win as unknown as { MutationObserver: typeof MutationObserver }
    const observer = new winWithObserver.MutationObserver((mutations) => {
      // Resolved at delivery time: a ref that attached after mount is tracked
      // without re-creating the observer (upstream re-creates it per element).
      const el = unrefElement(targetRef.current)
      if (!el)
        return

      const targetRemoved = mutations
        .map(mutation => [...mutation.removedNodes])
        .flat()
        .some(node => node === el || node.contains(el))

      if (targetRemoved)
        callbackRef.current(mutations)
    })
    observerRef.current = observer
    observer.observe(doc, { childList: true, subtree: true })
  })

  // Disconnect on unmount (upstream: `tryOnScopeDispose(stopHandle)`). Kept as
  // a separate mount-only effect so render-driven re-runs of the effect above
  // never disconnect an observer whose window/document are unchanged, and so a
  // StrictMode remount keeps observing.
  useEffect(() => () => {
    observerRef.current?.disconnect()
    observerRef.current = undefined
  }, [])

  // upstream `stopHandle`: stop watching and disconnect. Idempotent — the hook
  // does not restart after `stop()` (upstream stops its `watchEffect` too).
  const stop = useCallback(() => {
    stoppedRef.current = true
    observerRef.current?.disconnect()
    observerRef.current = undefined
  }, [])

  return stop
}
