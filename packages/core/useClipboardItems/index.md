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
