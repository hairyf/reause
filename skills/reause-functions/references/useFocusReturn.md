---
category: Sensors
---

# useFocusReturn

Return focus to the element that was active before an overlay opened — React port of `@mantine/hooks`' `useFocusReturn` (upstream mapping file: `source/mantine/packages/@mantine/hooks/src/use-focus-return/use-focus-return.ts`, 65 LOC; the directory ships no test file, so this port's suite is author-written rather than mirrored).

## Usage

```tsx
import { useFocusReturn } from '@reause/core'
import { useState } from 'react'

function Modal() {
  const [opened, setOpened] = useState(false)
  const returnFocus = useFocusReturn({ opened })

  return (
    <div>
      <button onClick={() => setOpened(true)}>Open</button>
      <input placeholder="Focus me before opening" />
      {opened && (
        <div>
          <input autoFocus placeholder="Inside the overlay" />
          <button onClick={() => setOpened(false)}>Close</button>
        </div>
      )}
    </div>
  )
}
```

The hook returns a function — call it yourself to restore focus, or let it run on the close:

```tsx
const returnFocus = useFocusReturn({ opened })

returnFocus() // focus the element that was active before the overlay opened
```

`document.activeElement` is snapshotted when `opened` flips to `true`, and the restore is deferred by a 10 ms timeout after `opened` flips to `false` so the closing transition can finish first. When that timeout fires, focus is restored only if nothing else claimed it during the close: the current active element has to be `null`, `document.body` (the overlay unmounted and focus fell back) or the element that was already active when the close rendered. A deliberate focus change wins over the snapshot. Restoring uses `focus({ preventScroll: true })`, and pressing `Tab` clears the pending timeout so a user who tabs away keeps their own focus target.

Pass `shouldReturnFocus: false` to keep the snapshot but never restore automatically — the returned function still works:

```tsx
const returnFocus = useFocusReturn({ opened, shouldReturnFocus: false })
```

To place it next to its siblings: `useFocus` and `useFocusWithin` own an element you hand them and track its focus state, while this hook owns nothing and keeps no state — it only remembers the previously active element so it can hand it back.

## Type Declarations

```ts
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
export declare function useFocusReturn({
  opened,
  shouldReturnFocus,
}: UseFocusReturnInput): UseFocusReturnReturnValue
```
