import { useUpdateEffect } from '@reause/shared'
import { useRef } from 'react'

export interface UseFocusReturnInput {
  /**
   * Whether the overlay (modal, drawer, popover, …) is currently open.
   */
  opened: boolean

  /**
   * Whether focus should be returned once `opened` flips back to `false`.
   *
   * @default true
   */
  shouldReturnFocus?: boolean
}

export type UseFocusReturnReturnValue = () => void

/**
 * Return focus to the element that was active before an overlay opened.
 *
 * Map from @mantine/hooks `useFocusReturn`
 * (`source/mantine/packages/@mantine/hooks/src/use-focus-return/`) — a direct
 * mirror, not a React-ified variant: the upstream signature and return value are
 * kept exactly (`useFocusReturn(input: { opened, shouldReturnFocus? })`), so the
 * hook returns a plain function — the `returnFocus` callback — rather than a
 * tuple, a ref, or a state pair. Call it manually, or let the hook call it when
 * the overlay closes.
 *
 * The timing and the guards are the whole point of the hook and are preserved
 * verbatim from upstream:
 *
 * - `document.activeElement` is snapshotted when `opened` flips to `true`, so
 *   the element to return to is the one that had focus *before* the overlay
 *   took it;
 * - the restore is deferred by a 10 ms `setTimeout` after `opened` flips to
 *   `false`, so the closing transition (and whatever the overlay does on the way
 *   out) can finish first;
 * - inside that timeout the restore is skipped unless the *current* active
 *   element is `null`, `document.body`, or the element that was already active
 *   when the close rendered — i.e. focus is restored only when nothing else
 *   claimed it after the closing transition. If a user (or an autofocus) moved
 *   focus deliberately, that choice wins;
 * - `returnFocus()` itself bails out when no element was ever captured (the
 *   snapshot is `null`) or when the captured node has no `focus` method, and it
 *   focuses with `{ preventScroll: true }` so restoring focus never scrolls the
 *   page back;
 * - a `keydown` listener clears the pending timeout on `Tab`, so a user tabbing
 *   away keeps their own focus target instead of being yanked back when the
 *   10 ms elapse. It is removed together with the timeout on cleanup.
 *
 * The update-only primitive is the sibling `useUpdateEffect` from
 * `@reause/shared` — the same rules-of-hooks-safe helper `useCollapse` needs —
 * rather than a third inlined copy of mantine's `useDidUpdate`. As upstream, the
 * effect is keyed on `[opened, shouldReturnFocus]`, so a close always arms a
 * fresh snapshot/timer pair and the previous one is cleared first.
 *
 * No React 19-only API is involved (no `React.useEffectEvent`): the only ref is
 * the `useRef` holding the snapshot, and the timer callback re-reads
 * `document.activeElement` when it fires, so the hook keeps working on the
 * `react >= 18` floor `@reause/core` declares. The effect body is the only
 * place that touches `document` or `window`, so nothing runs during SSR.
 *
 * Not related to the sibling `useFocus` (tracks / sets the focus state of one
 * element) or `useFocusWithin` (tracks whether focus is inside a subtree): this
 * hook owns no element and exposes no state, it only remembers the previously
 * active element and hands back a restore function.
 *
 * Under `StrictMode`, `useUpdateEffect`'s documented caveat applies: the mount
 * render is double-invoked there, so the mount effect is not skipped. That is
 * harmless here — the mount-time run happens before any overlay interaction, so
 * the snapshot it takes (or the unset snapshot it leaves) is the same one
 * upstream's `useDidUpdate` would take on the first real update.
 *
 * @example
 * const returnFocus = useFocusReturn({ opened })
 *
 * // when the overlay closes:
 * returnFocus()
 */
export function useFocusReturn({
  opened,
  shouldReturnFocus = true,
}: UseFocusReturnInput): UseFocusReturnReturnValue {
  const lastActiveElement = useRef<HTMLElement | null>(null)

  // Mirror of upstream's `returnFocus`: restore the snapshotted element, if one
  // was captured and it can actually take focus. `preventScroll` keeps the
  // restore from scrolling the page back to the element (upstream's value).
  const returnFocus = () => {
    const element = lastActiveElement.current
    if (element && 'focus' in element && typeof element.focus === 'function')
      element.focus({ preventScroll: true })
  }

  useUpdateEffect(() => {
    // `-1` is a no-op id for `clearTimeout`, so the cleanup below is safe when
    // neither branch scheduled a timeout (upstream's initial value).
    let timeout = -1

    // A user tabbing away during the closing transition keeps their own focus
    // target: the pending restore is cancelled instead of pulling focus back.
    const clearFocusTimeout = (event: KeyboardEvent) => {
      if (event.key === 'Tab')
        window.clearTimeout(timeout)
    }

    document.addEventListener('keydown', clearFocusTimeout)

    if (opened) {
      lastActiveElement.current = document.activeElement as HTMLElement
    }
    else if (shouldReturnFocus) {
      const activeElementAtClose = document.activeElement
      timeout = window.setTimeout(() => {
        // Restore only when nothing else claimed focus after the close: focus
        // fell back to `null` / `document.body`, or never moved in the first
        // place. Any other active element is a deliberate new target.
        const currentActiveElement = document.activeElement
        if (
          currentActiveElement === null
          || currentActiveElement === document.body
          || currentActiveElement === activeElementAtClose
        ) {
          returnFocus()
        }
      }, 10)
    }

    return () => {
      window.clearTimeout(timeout)
      document.removeEventListener('keydown', clearFocusTimeout)
    }
  }, [opened, shouldReturnFocus])

  return returnFocus
}
