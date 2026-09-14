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
   * A custom `document` instance, e.g. working with iframes or in testing environments.
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
  onChange: (fn: (files: FileList | null) => void) => () => void
  onCancel: (fn: () => void) => () => void
}
/**
 * Map from @vueuse/core `useFileDialog`
 * (`source/vueuse/packages/core/useFileDialog/`).
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
