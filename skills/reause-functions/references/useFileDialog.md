---
category: Browser
---

# useFileDialog

Open file dialog with ease

## Usage

```tsx
import { useFileDialog } from '@reause/core'
import { useListener } from '@reause/shared'

const {
  files,
  open,
  reset,
  onChange,
  onCancel,
} = useFileDialog({
  accept: 'image/*', // Set to accept only image files
  directory: true, // Select directories instead of files if set true
})

useListener(onChange, (files) => {
  /** do something with files */
})

useListener(onCancel, () => {
  /** do something on cancel */
})
```

With buttons:

```tsx
import { useFileDialog } from '@reause/core'

function Component() {
  const { files, open, reset } = useFileDialog()

  return (
    <div>
      <button type="button" onClick={() => open()}>
        Choose files
      </button>
      <button type="button" disabled={!files} onClick={() => reset()}>
        Reset
      </button>
    </div>
  )
}
```

## Type Declarations

```ts
export interface UseFileDialogOptions {
  /**
   * A custom `document` instance, e.g. working with iframes or in testing
   * environments. Inlined here — `ConfigurableDocument` is not ported to
   * `@reause/shared`, so `document?` mirrors the option `useTitle` exposes
   * (defaults to the global `document` when not provided).
   */
  document?: Document | null
  /**
   * @default true
   */
  multiple?: boolean
  /**
   * @default '*'
   */
  accept?: string
  /**
   * Select the input source for the capture file.
   * @see [HTMLInputElement Capture](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/capture)
   */
  capture?: string
  /**
   * Reset when open file dialog.
   * @default false
   */
  reset?: boolean
  /**
   * Select directories instead of files.
   * @see [HTMLInputElement webkitdirectory](https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/webkitdirectory)
   * @default false
   */
  directory?: boolean
  /**
   * Initial files to set.
   * @default null
   */
  initialFiles?: Array<File> | FileList
  /**
   * The input element to use for file dialog.
   * @default document.createElement('input')
   */
  input?: RefObject<HTMLInputElement | null>
}
export interface UseFileDialogReturn {
  files: FileList | null
  open: (localOptions?: Partial<UseFileDialogOptions>) => void
  reset: () => void
  onChange: (fn: (files: FileList | null) => void) => {
    off: () => void
  }
  onCancel: (fn: () => void) => {
    off: () => void
  }
}
/**
 * React port of VueUse's `useFileDialog`.
 *
 * Map from @vueuse/core `useFileDialog`
 * (`source/vueuse/packages/core/useFileDialog/`). Open file dialog with ease.
 *
 * The hook drives a hidden `<input type="file">` (created on mount unless a
 * custom `input` element is provided) and exposes `open` / `reset` / `files`
 * plus `onChange` / `onCancel` event hooks.
 *
 * React divergences:
 * - the Vue `files` shallowRef becomes plain state (`FileList | null`, no
 *   `.value`); `initialFiles` is read once at mount, like upstream setup;
 * - upstream's `createEventHook()` on* members become stable subscribe
 *   functions with the same `(fn) => { off }` shape, managed with Sets, so
 *   they are identity-stable across renders and compatible with the
 *   `useListener` protocol;
 * - the input element is resolved and wired in a mount effect instead of a
 *   `computed`, so nothing touches the DOM during render (SSR-safe);
 * - upstream's `watchEffect(() => applyOptions(options))` becomes an effect
 *   re-applying `multiple` / `accept` / `directory` / `capture` to the input
 *   whenever the (unwrapped) option values change across renders — mutate a
 *   ref-like source's `.current` and re-render to mirror `watchEffect` on a
 *   Vue ref;
 * - the event subscriptions are cleared on unmount (upstream:
 *   `tryOnScopeDispose` inside `createEventHook`'s `on`).
 *
 * @example
 * const { files, open, reset, onChange, onCancel } = useFileDialog({ accept: 'image/*' })
 *
 * useListener(onChange, (files) => {
 *   // do something with files
 * })
 *
 * useListener(onCancel, () => {
 *   // do something on cancel
 * })
 */
export declare function useFileDialog(
  options?: UseFileDialogOptions,
): UseFileDialogReturn
```
