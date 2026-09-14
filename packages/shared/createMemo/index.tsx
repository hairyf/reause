import { useMemo } from 'react'

/**
 * Map from react-use `createMemo`.
 *
 * @see https://github.com/streamich/react-use/blob/master/src/factory/createMemo.ts
 * @see https://github.com/streamich/react-use/blob/master/docs/createMemo.md
 */
/* @__NO_SIDE_EFFECTS__ */
export function createMemo<T extends (...args: any) => any>(
  fn: T,
): (...args: Parameters<T>) => ReturnType<T> {
  return (...args: Parameters<T>): ReturnType<T> =>
    useMemo<ReturnType<T>>(() => fn(...args), args)
}
