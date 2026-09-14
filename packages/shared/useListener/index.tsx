import { useEffect, useRef } from 'react'

/**
 * A listener registration function — the `onXxx` callbacks returned by hooks such as
 * `useFileDialog`'s `onChange` / `onCancel`. Mirror of upstream `EventHookOn<T>`.
 */
export type ListenerOn<T extends (...args: any[]) => void> = (fn: T) => { off: () => void } | void

/**
 * Map from @reause/shared `useListener` (protocol: #129).
 *
 * @example
 * const { files, open, onChange } = useFileDialog()
 * useListener(onChange, (files) => { console.log(files) })
 */
export function useListener<T extends (...args: any[]) => void>(
  on: ListenerOn<T>,
  cb: T,
): void {
  const cbRef = useRef<T>(cb)
  cbRef.current = cb

  useEffect(() => {
    if (typeof on !== 'function')
      return

    // register with the latest callback — the ref keeps it fresh without
    // re-registering on every render
    const result = on(((...args: any[]) => cbRef.current(...args)) as T)

    return () => {
      result?.off?.()
    }
  }, [on])
}
