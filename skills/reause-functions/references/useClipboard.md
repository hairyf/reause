---
category: Browser
---

# useClipboard

Reactive [Clipboard API](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API). Provides the ability to respond to clipboard commands (cut, copy, and paste) as well as to asynchronously read from and write to the system clipboard. Access to the contents of the clipboard is gated behind the [Permissions API](https://developer.mozilla.org/en-US/docs/Web/API/Permissions_API). Without user permission, reading or altering the clipboard contents is not permitted.

## Usage

```tsx
import { useClipboard } from '@reause/core'

const [text, copy, { copied, isSupported }] = useClipboard({ source: 'Hello' })

copy('Hello') // writes to the clipboard; `copied` auto-resets after 1.5s
```

Pass React state directly — the hook always reads the latest value, so reactive sources need no wrapper:

```tsx
const [source, setSource] = useState('Hello')
const [text, copy, { copied }] = useClipboard({ source })

setSource('World')
copy() // copies 'World'
```

### Options

| Option         | Type      | Default | Description                                                       |
| -------------- | --------- | ------- | ----------------------------------------------------------------- |
| `source`       | `string`  | —       | Default content to copy when `copy()` is called without arguments |
| `read`         | `boolean` | `false` | Enable reading clipboard content on copy/cut events               |
| `copiedDuring` | `number`  | `1500`  | Milliseconds before `copied` resets to `false`                    |
| `legacy`       | `boolean` | `false` | Fallback to `document.execCommand` if Clipboard API unavailable   |

### Return Values

- `text` — current clipboard content (plain string state; updated by `copy` and, when `read: true`,
  by `copy`/`cut` events on `window`).
- `copy(text?)` — copy text to the clipboard; accepts a string or a promise producing one, and can
  be called without arguments to copy the `source` option.
- `controls.copied` — `true` after a successful copy, auto-resets to `false` after `copiedDuring`
  milliseconds.
- `controls.isSupported` — whether clipboard is supported (native Clipboard API or `legacy: true`
  fallback).
- `controls.copyPending` — `true` while a `copy` call is in flight.

The `controls` object (`{ copied, isSupported, copyPending }`) keeps a stable identity while its
members are unchanged.

### Legacy Mode

Set `legacy: true` to keep the ability to copy if [Clipboard API](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API) is not available. It will handle copy with [execCommand](https://developer.mozilla.org/en-US/docs/Web/API/Document/execCommand) as fallback.

```tsx
const [, copy, { isSupported }] = useClipboard({ legacy: true })
```

## Type Declarations

```ts
export interface UseClipboardOptions<Source> {
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
   * Milliseconds to reset state of `copied` state
   *
   * @default 1500
   */
  copiedDuring?: number
  /**
   * Whether fallback to document.execCommand('copy') if clipboard is undefined.
   *
   * @default false
   */
  legacy?: boolean
  /**
   * Specify a custom `navigator` instance, e.g. working with iframes or in testing environments.
   */
  navigator?: Navigator
}
type ClipboardValue = string | (() => Promise<string | undefined>)
export type UseClipboardReturn<Optional> = readonly [
  /**
   * Current clipboard text — updated by `copy` and, when `read: true`, by `copy`/`cut` events on
   * `window`.
   */
  text: string,
  /**
   * Writes to the clipboard. Resolves when the write completes — through the native Async Clipboard
   * API when available, falling back to `document.execCommand('copy')` otherwise. Accepts a string
   * or a promise producing one. When `source` is provided, it can be called without an argument to
   * copy the (resolved) source value.
   */
  copy: Optional extends true
    ? (text?: ClipboardValue) => Promise<void>
    : (text: ClipboardValue) => Promise<void>,
  controls: {
    /**
     * `true` after a successful copy, auto-resets to `false` after `copiedDuring` milliseconds.
     */
    copied: boolean
    /**
     * `true` when the resolved navigator exposes `clipboard` (native Clipboard API) or `legacy: true`
     * opts into the `document.execCommand` fallback. Resolved in a mount effect, so it stays `false`
     * during the first render and on the server (SSR-safe).
     */
    isSupported: boolean
    /**
     * `true` while a `copy` call is in flight.
     */
    copyPending: boolean
  },
]
/**
 * Map from @vueuse/core `useClipboard`
 * (`source/vueuse/packages/core/useClipboard/`).
 *
 * @example
 * const [text, copy, { copied, isSupported }] = useClipboard({ source: 'Hello' })
 *
 * copy('Hello') // writes to the clipboard; `copied` auto-resets after 1.5s
 */
export declare function useClipboard(
  options?: UseClipboardOptions<undefined>,
): UseClipboardReturn<false>
export declare function useClipboard(
  options: UseClipboardOptions<string>,
): UseClipboardReturn<true>
```
