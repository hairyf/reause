---
category: Utilities
---

# useConfirmDialog

Creates event hooks to support modals and confirmation dialog chains

## Functions and hooks

- `reveal()` - triggers `onReveal` hook and sets `isRevealed` to `true`. Returns promise that resolves by `confirm()` or `cancel()`.
- `confirm()` - sets `isRevealed` to `false` and triggers `onConfirm` hook.
- `cancel()` - sets `isRevealed` to `false` and triggers `onCancel` hook.

## Basic Usage

### Using hooks

The returned `onReveal` / `onConfirm` / `onCancel` are stable registration functions following the `useListener` protocol — each accepts a callback and returns the `off` function that unsubscribes it, so listeners never leak and never fire after the component unmounts:

```tsx
import { useConfirmDialog } from '@reause/core'
import { useListener } from '@reause/shared'

const { isRevealed, reveal, confirm, cancel, onReveal, onConfirm, onCancel }
  = useConfirmDialog()

useListener(onReveal, () => {
  // modal shown
})

function Component() {
  return (
    <>
      <button type="button" onClick={() => reveal()}>
        Reveal Modal
      </button>

      {isRevealed && (
        <div className="modal-bg">
          <div className="modal">
            <h2>Confirm?</h2>
            <button type="button" onClick={() => confirm()}>
              Yes
            </button>
            <button type="button" onClick={() => cancel()}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  )
}
```

### Promise

If you prefer working with promises:

```tsx
import { useConfirmDialog } from '@reause/core'

const {
  isRevealed,
  reveal,
  confirm,
  cancel,
} = useConfirmDialog()

async function openDialog() {
  const { data, isCanceled } = await reveal()
  if (!isCanceled)
    console.log(data)
}
```

`useConfirmDialog` accepts an optional React ref source (`RefObject<boolean>`, e.g. the result of `useRef`) that the controls keep in sync — mirroring upstream's optional `shallowRef` parameter. When omitted, the revealed state is internal:

```tsx
import { useConfirmDialog } from '@reause/core'
import { useRef } from 'react'

const show = useRef(false)
const { isRevealed, reveal, confirm, cancel } = useConfirmDialog(show)
```

## Type Declarations

```ts
export type UseConfirmDialogRevealResult<C, D> =
  | {
      data?: C
      isCanceled: false
    }
  | {
      data?: D
      isCanceled: true
    }
export interface UseConfirmDialogReturn<RevealData, ConfirmData, CancelData> {
  /**
   * Revealing state
   */
  isRevealed: boolean
  /**
   * Opens the dialog. Create promise and return it. Triggers `onReveal` hook.
   */
  reveal: (
    data?: RevealData,
  ) => Promise<UseConfirmDialogRevealResult<ConfirmData, CancelData>>
  /**
   * Confirms and closes the dialog. Triggers a callback inside `onConfirm` hook. Resolves promise
   * from `reveal()` with `data` and `isCanceled` ref with `false` value. Can accept any data and to
   * pass it to `onConfirm` hook.
   */
  confirm: (data?: ConfirmData) => void
  /**
   * Cancels and closes the dialog. Triggers a callback inside `onCancel` hook. Resolves promise
   * from `reveal()` with `data` and `isCanceled` ref with `true` value. Can accept any data and to
   * pass it to `onCancel` hook.
   */
  cancel: (data?: CancelData) => void
  /**
   * Event Hook to be triggered right before dialog creating. Returns the off function that removes
   * the listener.
   */
  onReveal: (fn: (data: RevealData) => void) => () => void
  /**
   * Event Hook to be called on `confirm()`. Gets data object from `confirm` function.
   */
  onConfirm: (fn: (data: ConfirmData) => void) => () => void
  /**
   * Event Hook to be called on `cancel()`. Gets data object from `cancel` function.
   */
  onCancel: (fn: (data: CancelData) => void) => () => void
}
/**
 * Map from @vueuse/core `useConfirmDialog`
 * (`source/vueuse/packages/core/useConfirmDialog/`).
 *
 * @example
 * const { isRevealed, reveal, confirm, cancel, onReveal, onConfirm, onCancel } = useConfirmDialog()
 *
 * useListener(onReveal, () => {
 *   // modal shown
 * })
 *
 * async function openDialog() {
 *   const { data, isCanceled } = await reveal()
 *   if (!isCanceled)
 *     console.log(data)
 * }
 */
export declare function useConfirmDialog<
  RevealData = any,
  ConfirmData = any,
  CancelData = any,
>(
  revealed?: RefObject<boolean>,
): UseConfirmDialogReturn<RevealData, ConfirmData, CancelData>
```
