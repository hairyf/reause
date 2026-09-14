import { useCallback, useRef } from 'react'

/**
 * Map from ahooks `useLockFn`.
 *
 * @param fn The async function to lock. Called with the wrapper's arguments and
 * awaited; its rejection is rethrown to the caller of the wrapper. Its identity
 * is the wrapper's only `useCallback` dependency.
 * @returns A locked wrapper: `(...args: P) => Promise<V | undefined>`, where a
 * resolved `undefined` means the call was dropped because another was still in
 * flight.
 *
 * @example
 * const submit = useLockFn(async () => {
 *   await api.submit()
 * })
 *
 * // rapid double-click: the first call runs, the second resolves to undefined
 * submit()
 * submit() // Promise<undefined> — dropped, not queued
 */
export function useLockFn<P extends any[] = any[], V = any>(fn: (...args: P) => Promise<V>) {
  const lockRef = useRef(false)

  return useCallback(
    async (...args: P) => {
      if (lockRef.current) {
        return
      }
      lockRef.current = true
      try {
        const ret = await fn(...args)
        return ret
      }
      // Upstream's clause, kept so this file diffs cleanly against the pin. It is
      // provably redundant beside the `finally` below (the lock is released
      // either way, and an uncaught error propagates on its own), so deleting it
      // would change no behaviour — but it is upstream's text and the port
      // mirrors upstream, so it stays.
      // eslint-disable-next-line no-useless-catch -- upstream's redundant rethrow, kept to mirror the pin
      catch (e) {
        throw e
      }
      finally {
        lockRef.current = false
      }
    },
    [fn],
  )
}
