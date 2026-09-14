import { useEffect, useRef } from 'react'

/**
 * Map from @vueuse/core `usePrevious`
 * (`source/vueuse/packages/core/usePrevious/`).
 *
 * @example
 * const previous = usePrevious(counter) // `undefined` until the first change
 * const previous = usePrevious(counter, 0) // `0` until the first change
 *
 * @see   {@link https://vueuse.org/core/usePrevious}
 */
export function usePrevious<T>(value: T): T | undefined
export function usePrevious<T>(value: T, initialValue: T): T
export function usePrevious<T>(value: T, initialValue?: T): T | undefined {
  const previousRef = useRef<T | undefined>(initialValue)

  useEffect(() => {
    previousRef.current = value
  }, [value])

  return previousRef.current
}
