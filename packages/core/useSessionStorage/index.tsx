import type { UseStorageOptions, UseStorageReturn } from '../useStorage'
import { useStorage } from '../useStorage'

export function useSessionStorage(key: string, initialValue: string, options?: UseStorageOptions<string>): UseStorageReturn<string>
export function useSessionStorage(key: string, initialValue: boolean, options?: UseStorageOptions<boolean>): UseStorageReturn<boolean>
export function useSessionStorage(key: string, initialValue: number, options?: UseStorageOptions<number>): UseStorageReturn<number>
export function useSessionStorage<T>(key: string, initialValue: T | (() => T), options?: UseStorageOptions<T>): UseStorageReturn<T>
export function useSessionStorage<T = unknown>(key: string, initialValue: null, options?: UseStorageOptions<T>): UseStorageReturn<T>

/**
 * Map from @vueuse/core `useSessionStorage`
 * (`source/vueuse/packages/core/useSessionStorage/`).
 *
 * @example
 * const [state, setState] = useSessionStorage('my-store', { hello: 'hi', greeting: 'Hello' })
 * const [flag, setFlag] = useSessionStorage('my-flag', true)
 *
 * setState(null) // delete data from storage
 *
 * @see https://vueuse.org/core/useSessionStorage/
 */
export function useSessionStorage<T extends (string | number | boolean | object | null)>(
  key: string,
  initialValue: T | (() => T),
  options: UseStorageOptions<T> = {},
): UseStorageReturn<T> {
  // mirror upstream's `defaultWindow` fallback: resolve the window here (the
  // shared `useStorage` only re-resolves it when no explicit storage argument
  // is given) and bind it to `sessionStorage`
  const win = options.window ?? (typeof window === 'undefined' ? undefined : window)
  return useStorage(key, initialValue, win?.sessionStorage, options)
}
