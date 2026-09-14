import { useCallback, useEffect, useRef } from 'react'

export type Truthy<T> = T extends false | null | undefined ? never : T

export interface UseWheneverOptions {
  /**
   * Fire the callback on mount if the value is already truthy
   *
   * @default false
   */
  immediate?: boolean

  /**
   * Only trigger once when the condition is met — the watch stops after the first truthy fire
   *
   * @default false
   */
  once?: boolean
}

/**
 * Map from @vueuse/shared `whenever`
 * Mapping: upstream `whenever` is Vue's `watch` plus a truthy guard — the callback runs every time
 * the source CHANGES to a truthy value (a re-render with the same truthy value never fires). In
 * React this becomes a `useEffect` watching `[value]`: the initial mount is skipped unless
 * `immediate` (which fires with `oldValue` `undefined`), later runs fire when the value is truthy
 * and actually changed, and the previous value is tracked in a ref updated on every run — mirroring
 * `watch`'s `oldValue`, which advances through falsy values too. The callback is kept in a ref so
 * re-renders always invoke the newest one.
 *
 * The `once` option stops the watch after the first truthy fire — expressible in React as a
 * one-shot flag consulted by the effect, mirroring upstream's `if (options?.once) nextTick(() =>
 * stop())`.
 *
 * The return value is a `stop` function — upstream's `WatchHandle`, reduced to the stop capability
 * (house `useWatch` has no stop-handle infrastructure). `stop()` is also called when the component
 * unmounts.
 *
 * The upstream 3-arg callback `(value, oldValue, onInvalidate)` becomes a 2-arg `(value, oldValue)`
 * in this port — `onInvalidate` (Vue's effect invalidation registration) has no React equivalent,
 * so it is dropped.
 *
 * @see https://vueuse.org/shared/whenever/
 *
 * @example
 * useWhenever(ready, () => console.log(state))
 * useWhenever(ready, () => console.log(state), { immediate: true })
 * useWhenever(ready, () => console.log(state), { once: true })
 */
export function useWhenever<T>(
  value: T,
  cb: (value: Truthy<T>, oldValue: T | undefined) => void,
  options?: UseWheneverOptions,
): () => void {
  const cbRef = useRef(cb)

  // update the ref each render so if it change the newest callback will be invoked
  cbRef.current = cb

  const oldValueRef = useRef<T | undefined>(undefined)
  const isFirstRenderRef = useRef(true)
  const stoppedRef = useRef(false)

  useEffect(() => {
    if (stoppedRef.current)
      return

    const isFirstRender = isFirstRenderRef.current
    isFirstRenderRef.current = false

    const isMountFire = isFirstRender && options?.immediate === true
    // the change check also keeps StrictMode's double-invoked mount effect
    // from firing the callback twice
    const isChange = !Object.is(oldValueRef.current, value)

    if (value && (isMountFire || (!isFirstRender && isChange))) {
      // upstream: `if (options?.once) nextTick(() => stop())` — the first
      // truthy fire stops the watch so no later change can fire again
      if (options?.once)
        stoppedRef.current = true
      cbRef.current(value as Truthy<T>, oldValueRef.current)
    }

    oldValueRef.current = value
  }, [value])

  const stop = useCallback(() => {
    stoppedRef.current = true
  }, [])

  // stop the watch when the component unmounts (upstream's effect teardown)
  useEffect(() => stop, [stop])

  return stop
}
