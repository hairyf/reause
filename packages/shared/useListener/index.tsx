import { useEffect, useRef } from 'react'

/**
 * A listener registration function — the `onXxx` callbacks returned by hooks such as
 * `useFileDialog`'s `onChange` / `onCancel`, and `createEventHook`'s `on`.
 *
 * Registration returns the cleanup function that removes that exact listener, so a caller can
 * unsubscribe by simply invoking the return value. `void` marks a source that cannot unregister.
 */
export type ListenerOn<T extends (...args: any[]) => void> = (fn: T) => (() => void) | void

/**
 * Map from @reause/shared `useListener` (protocol: #129).
 *
 * Accepts either the registration function itself or any object carrying it as `on` (e.g. a
 * `createEventHook()` result), and unregisters through the returned off function.
 *
 * @example
 * const { files, open, onChange } = useFileDialog()
 * useListener(onChange, (files) => { console.log(files) })
 *
 * @example
 * const resultEvent = createEventHook<Response>()
 * useListener(resultEvent, (response) => { console.log(response) })
 * resultEvent.trigger(response)
 */
export function useListener<T extends (...args: any[]) => void>(
  on: ListenerOn<T> | { on: ListenerOn<T> },
  cb: T,
): void {
  const cbRef = useRef<T>(cb)
  cbRef.current = cb

  useEffect(() => {
    const register = typeof on === 'function' ? on : on?.on
    if (typeof register !== 'function')
      return

    // register with the latest callback — the ref keeps it fresh without
    // re-registering on every render
    const off = register(((...args: any[]) => cbRef.current(...args)) as T)

    return () => {
      if (typeof off === 'function')
        off()
    }
  }, [on])
}
