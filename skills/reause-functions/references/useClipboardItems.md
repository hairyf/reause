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

const [content, copy, { copied, isSupported }] = useClipboardItems({ source })

// by default, `copied` will be reset to `false` in 1.5s
// (configure it with the `copiedDuring` option, in milliseconds)
copy(source)
```

### Return Values

- `content` — the clipboard items currently read from the system clipboard (plain state; updated by
  a successful `copy`, by `controls.read()` and, when `read: true`, by `copy`/`cut` events).
- `copy(content?)` — write `ClipboardItem`s to the clipboard; may be called without arguments to
  copy the `source` option.
- `controls.copied` — whether the last `copy` call succeeded, auto-resets to `false` after
  `copiedDuring` milliseconds.
- `controls.isSupported` — whether the resolved navigator exposes the Clipboard API.
- `controls.read()` — manually read the current clipboard content into `content`.

The `controls` object (`{ copied, isSupported, read }`) keeps a stable identity while its members
are unchanged.

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
   * Specify a custom `navigator` instance, e.g. working with iframes or in testing environments.
   * Declared inline instead of composing a shared `ConfigurableNavigator` type because other core
   * hooks export a same-named type — `export *` in `index.ts` would collide (TS2308), so like
   * `useGamepad` this module declares the member directly.
   */
  navigator?: Navigator
}
export type UseClipboardItemsReturn<Optional> = readonly [
  /**
   * The clipboard items currently read from the system clipboard. Updated by a successful `copy`,
   * by a manual `read()` call, and automatically when `read` is enabled and a `copy` / `cut` event
   * fires.
   */
  content: ClipboardItems,
  /**
   * Asynchronously writes `content` to the system clipboard. When the `source` option is provided
   * it may be called without arguments; it is a no-op (resolves without writing) when the Clipboard
   * API is unsupported or when no value is available.
   *
   * The parameter is named `content` — upstream names it `text` (`copy: (text: ClipboardItems) =>
   * Promise<void>`). Same type and semantics; `content` matches the returned `content` value and
   * avoids confusion with `useClipboard`'s text-only `text`.
   */
  copy: Optional extends true
    ? (content?: ClipboardItems) => Promise<void>
    : (content: ClipboardItems) => Promise<void>,
  controls: {
    /**
     * Whether the last `copy` call succeeded. Resets to `false` after `copiedDuring` milliseconds via
     * a timeout.
     */
    copied: boolean
    /**
     * `true` when the resolved navigator exposes the Clipboard API (`'clipboard' in navigator`).
     * Resolved in a mount effect, so it stays `false` during the first render and on the server
     * (SSR-safe).
     */
    isSupported: boolean
    /**
     * Manually reads the current clipboard content into `content`.
     */
    read: () => void
  },
]
/**
 * Map from @vueuse/core `useClipboardItems`
 * (`source/vueuse/packages/core/useClipboardItems/`).
 *
 * @example
 * const source = [
 *   new ClipboardItem({
 *     'text/plain': new Blob(['plain text'], { type: 'text/plain' }),
 *   }),
 * ]
 *
 * const [content, copy, { copied, isSupported }] = useClipboardItems({ source })
 */
export declare function useClipboardItems(
  options?: UseClipboardItemsOptions<undefined>,
): UseClipboardItemsReturn<false>
export declare function useClipboardItems(
  options: UseClipboardItemsOptions<ClipboardItems>,
): UseClipboardItemsReturn<true>
```
