import type { RefObject } from 'react'
import { noop } from '@reause/shared'
import { useCallback, useEffect, useRef, useState } from 'react'

export type UseConfirmDialogRevealResult<C, D>
  = {
    data?: C
    isCanceled: false
  } | {
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
  reveal: (data?: RevealData) => Promise<UseConfirmDialogRevealResult<ConfirmData, CancelData>>

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
   * Event Hook to be triggered right before dialog creating.
   */
  onReveal: (fn: (data: RevealData) => void) => { off: () => void }

  /**
   * Event Hook to be called on `confirm()`. Gets data object from `confirm` function.
   */
  onConfirm: (fn: (data: ConfirmData) => void) => { off: () => void }

  /**
   * Event Hook to be called on `cancel()`. Gets data object from `cancel` function.
   */
  onCancel: (fn: (data: CancelData) => void) => { off: () => void }
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
export function useConfirmDialog<
  RevealData = any,
  ConfirmData = any,
  CancelData = any,
>(
  revealed?: RefObject<boolean>,
): UseConfirmDialogReturn<RevealData, ConfirmData, CancelData> {
  // Keep the external ref source in a ref so the controls stay
  // identity-stable regardless of when the argument object is created.
  const revealedRef = useRef(revealed)
  revealedRef.current = revealed

  const [isRevealed, setIsRevealed] = useState<boolean>(revealed?.current ?? false)

  // Mirror out-of-band writes to the external `revealed` ref (e.g. a modal
  // closed outside the controls). Upstream's `isRevealed` is
  // `computed(() => revealed.value)`, so it reflects the ref as soon as it is
  // read; React state can only re-sync during a render, hence this render-time
  // comparison (React's "adjusting state when a prop changes" pattern). A
  // write with no subsequent re-render still cannot be observed.
  if (revealed && revealed.current !== isRevealed)
    setIsRevealed(revealed.current)

  // Event hooks: upstream `createEventHook()` — one stable subscribe function
  // per event, returning an `off` handle to unsubscribe. The sets are stored
  // in refs so the subscribe functions stay identity-stable.
  const revealFns = useRef(new Set<(data: RevealData) => void>())
  const confirmFns = useRef(new Set<(data: ConfirmData) => void>())
  const cancelFns = useRef(new Set<(data: CancelData) => void>())

  const onReveal = useCallback((fn: (data: RevealData) => void) => {
    revealFns.current.add(fn)
    return {
      off: () => {
        revealFns.current.delete(fn)
      },
    }
  }, [])

  const onConfirm = useCallback((fn: (data: ConfirmData) => void) => {
    confirmFns.current.add(fn)
    return {
      off: () => {
        confirmFns.current.delete(fn)
      },
    }
  }, [])

  const onCancel = useCallback((fn: (data: CancelData) => void) => {
    cancelFns.current.add(fn)
    return {
      off: () => {
        cancelFns.current.delete(fn)
      },
    }
  }, [])

  const setRevealed = useCallback((value: boolean) => {
    if (revealedRef.current)
      revealedRef.current.current = value
    setIsRevealed(value)
  }, [])

  // Resolver for the pending `reveal()` promise — upstream keeps a closure
  // variable, React mirrors it with a ref (initialized to `noop`).
  const resolveRef = useRef<(result: UseConfirmDialogRevealResult<ConfirmData, CancelData>) => void>(noop)

  const reveal = useCallback((data?: RevealData) => {
    // Upstream `createEventHook().trigger()` is
    // `Promise.all(Array.from(fns).map(fn => fn(...args)))`: collecting the
    // listener return values lets an async listener's rejection surface on the
    // (discarded) aggregate promise, exactly as upstream; a synchronous throw
    // still propagates to this caller.
    Promise.all(Array.from(revealFns.current).map(fn => fn(data as RevealData)))
    setRevealed(true)

    return new Promise<UseConfirmDialogRevealResult<ConfirmData, CancelData>>((resolve) => {
      resolveRef.current = resolve
    })
  }, [setRevealed])

  const confirm = useCallback((data?: ConfirmData) => {
    setRevealed(false)
    // Same `Promise.all` collection as `reveal()` — see the comment there.
    Promise.all(Array.from(confirmFns.current).map(fn => fn(data as ConfirmData)))

    resolveRef.current({ data, isCanceled: false })
  }, [setRevealed])

  const cancel = useCallback((data?: CancelData) => {
    setRevealed(false)
    // Same `Promise.all` collection as `reveal()` — see the comment there.
    Promise.all(Array.from(cancelFns.current).map(fn => fn(data as CancelData)))

    resolveRef.current({ data, isCanceled: true })
  }, [setRevealed])

  // Unmount cleanup of the event subscriptions (upstream: `tryOnScopeDispose`
  // inside createEventHook's `on`).
  useEffect(() => {
    return () => {
      revealFns.current.clear()
      confirmFns.current.clear()
      cancelFns.current.clear()
    }
  }, [])

  return {
    isRevealed,
    reveal,
    confirm,
    cancel,
    onReveal,
    onConfirm,
    onCancel,
  }
}
