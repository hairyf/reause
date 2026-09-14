import { useEffect, useRef } from 'react'

export interface UseWatchCallback<T = any> {
  (value: T, oldValue: T | undefined): void
}

export interface UseWatchOptions {
  /**
   * Fire the callback once on mount with the current value.
   * @default false
   */
  immediate?: boolean
}

/**
 * Map from @vueuse/shared `watch`.
 *
 * @example
 * ```ts
 * useWatch(count, (value, oldValue) => console.log(value, oldValue))
 * useWatch([count, name], (value, oldValue) => console.log(value, oldValue))
 * ```
 */
export function useWatch<T extends any[]>(source: readonly [...T], callback: UseWatchCallback<[...T]>, options?: UseWatchOptions): void
export function useWatch<T>(source: T, callback: UseWatchCallback<T>, options?: UseWatchOptions): void
export function useWatch(source: any, callback: UseWatchCallback, options: UseWatchOptions = {}) {
  const firstRender = useRef(true)
  const oldValueRef = useRef<any>(undefined)
  const deps = Array.isArray(source) ? source : [source]

  useEffect(() => {
    const oldValue = oldValueRef.current
    const first = firstRender.current
    firstRender.current = false
    if (!first || options.immediate)
      callback(source, oldValue)
    oldValueRef.current = source
  }, deps)
}
