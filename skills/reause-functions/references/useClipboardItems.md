---
category: Browser
related:
  - useClipboard
---

# useClipboardItems

Reactive [Clipboard API](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API). Provides the ability to respond to clipboard commands (cut, copy, and paste) as well as to asynchronously read from and write to the system clipboard. Access to the contents of the clipboard is gated behind the [Permissions API](https://developer.mozilla.org/en-US/docs/Web/API/Permissions_API). Without user permission, reading or altering the clipboard contents is not permitted.

## Difference from `useClipboard`

`useClipboard` is a "text-only" function, while `useClipboardItems` is a [ClipboardItem](https://developer.mozilla.org/en-US/docs/Web/API/ClipboardItem) based function. You can use `useClipboardItems` to copy any content supported by [ClipboardItem](https://developer.mozilla.org/en-US/docs/Web/API/ClipboardItem).

## Usage

```tsx
import { useClipboardItems } from '@reause/core'

const source = [
  new ClipboardItem({
    'text/plain': new Blob(['plain text'], { type: 'text/plain' }),
  }),
]

const { content, copy, copied, isSupported } = useClipboardItems({ source })

// by default, `copied` will be reset to `false` in 1.5s
// (configure it with the `copiedDuring` option, in milliseconds)
copy(source)
```

## React divergences

- `copy()`'s argument is named `content`, not upstream's `text` (upstream declares `copy: Optional extends true ? (content?: ClipboardItems) => Promise<void> : (text: ClipboardItems) => Promise<void>`). Same type and semantics — kept because it matches the returned `content` value and avoids confusion with `useClipboard`'s text-only `text`.
- Upstream binds the `copy` / `cut` listeners once at setup (when `read` is enabled and the Clipboard API is supported). reause binds them in an effect keyed on `read` and `isSupported`, so toggling `read` after mount adds or removes the listeners — strictly more reactive than upstream's freeze-in.
- `content` and `copied` are plain state values (no `.value`), and `isSupported` is a plain boolean resolved in a mount effect: it is `false` during the first render and on the server, then flips to `true` after mount when the resolved navigator exposes the Clipboard API.

## Type Declarations

```ts
export interface UseClipboardItemsOptions<Source> {
  /**
   * Enabled reading for clipboard
   *
   * @default false
   */
  read?: boolean
  /**
   * Copy source
   */
  source?: Source
  /**
   * Milliseconds to reset state of `copied`
   *
   * @default 1500
   */
  copiedDuring?: number
  /**
   * Specify a custom `navigator` instance, e.g. working with iframes or in
   * testing environments. Declared inline instead of composing a shared
   * `ConfigurableNavigator` type because other core hooks export a same-named
   * type — `export *` in `index.ts` would collide (TS2308), so like
   * `useGamepad` this module declares the member directly.
   */
  navigator?: Navigator
}
export interface UseClipboardItemsReturn<Optional> {
  /**
   * `true` when the resolved navigator exposes the Clipboard API
   * (`'clipboard' in navigator`). Resolved in a mount effect, so it stays
   * `false` during the first render and on the server (SSR-safe).
   */
  isSupported: boolean
  /**
   * The clipboard items currently read from the system clipboard. Updated by
   * a successful `copy`, by a manual `read()` call, and automatically when
   * `read` is enabled and a `copy` / `cut` event fires.
   */
  content: ClipboardItems
  /**
   * Whether the last `copy` call succeeded. Resets to `false` after
   * `copiedDuring` milliseconds via a timeout.
   */
  copied: boolean
  /**
   * Asynchronously writes `content` to the system clipboard. When the
   * `source` option is provided it may be called without arguments; it is a
   * no-op (resolves without writing) when the Clipboard API is unsupported
   * or when no value is available.
   *
   * The parameter is named `content` — upstream names it `text`
   * (`copy: (text: ClipboardItems) => Promise<void>`). Same type and
   * semantics; `content` matches the returned `content` value and avoids
   * confusion with `useClipboard`'s text-only `text`.
   */
  copy: Optional extends true
    ? (content?: ClipboardItems) => Promise<void>
    : (content: ClipboardItems) => Promise<void>
  /**
   * Manually reads the current clipboard content into `content`.
   */
  read: () => void
}
/**
 * Reactive [Clipboard API](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API).
 *
 * Map from @vueuse/core `useClipboardItems`
 * (`source/vueuse/packages/core/useClipboardItems/`). Provides the ability
 * to respond to clipboard commands (cut, copy and paste) as well as to
 * asynchronously read from and write to the system clipboard. Access to the
 * contents of the clipboard is gated behind the
 * [Permissions API](https://developer.mozilla.org/en-US/docs/Web/API/Permissions_API).
 *
 * React divergences:
 * - the Vue `content` / `copied` shallow refs become plain state values read
 *   directly, and `isSupported` (upstream `useSupported` computed) becomes a
 *   plain boolean resolved once in a mount effect — nothing touches
 *   `window` or `navigator` during render, so SSR renders the defaults;
 * - upstream binds the copy/cut listeners once at setup (after the support
 *   check passes); here a self-contained effect (the pattern of
 *   `useMagicKeys` / `useNetwork`) binds `copy` / `cut` on `window` while
 *   `read` is enabled and the Clipboard API is supported, so toggling `read`
 *   after mount re-binds or removes them (strictly more reactive than
 *   upstream's freeze-in), and removes them on unmount;
 * - `copy` is a stable callback that resolves the `source` option at call
 *   time (a plain value; upstream accepts a ref), writes no-op when
 *   the API is unsupported or no value is available, and sets `content` +
 *   `copied` after a successful write;
 * - the `copiedDuring` reset timer composes `@reause/shared` `useTimeoutFn`
 *   with `immediate: false`, and the pending timer is cleared on unmount.
 *
 * @example
 * const source = [
 *   new ClipboardItem({
 *     'text/plain': new Blob(['plain text'], { type: 'text/plain' }),
 *   }),
 * ]
 *
 * const { isSupported, content, copy, copied } = useClipboardItems({ source })
 */
export declare function useClipboardItems(
  options?: UseClipboardItemsOptions<undefined>,
): UseClipboardItemsReturn<false>
export declare function useClipboardItems(
  options: UseClipboardItemsOptions<ClipboardItems>,
): UseClipboardItemsReturn<true>
```
