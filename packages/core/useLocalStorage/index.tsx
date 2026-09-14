import type { UseStorageOptions, UseStorageReturn } from '../useStorage'
import { useStorage } from '../useStorage'

export function useLocalStorage(key: string, initialValue: string, options?: UseStorageOptions<string>): UseStorageReturn<string>
export function useLocalStorage(key: string, initialValue: boolean, options?: UseStorageOptions<boolean>): UseStorageReturn<boolean>
export function useLocalStorage(key: string, initialValue: number, options?: UseStorageOptions<number>): UseStorageReturn<number>
export function useLocalStorage<T>(key: string, initialValue: T | (() => T), options?: UseStorageOptions<T>): UseStorageReturn<T>
export function useLocalStorage<T = unknown>(key: string, initialValue: null, options?: UseStorageOptions<T>): UseStorageReturn<T>

/**
 * Map from @vueuse/core `useLocalStorage`
 * (`source/vueuse/packages/core/useLocalStorage/`).
 *
 * @example
 * const [state, setState] = useLocalStorage('my-store', { hello: 'hi', greeting: 'Hello' })
 * const [flag, setFlag] = useLocalStorage('my-flag', true)
 *
 * setState(null) // delete data from storage
 *
 * @see https://vueuse.org/core/useLocalStorage/
 */
export function useLocalStorage<T extends (string | number | boolean | object | null)>(
  key: string,
  initialValue: T | (() => T),
  options: UseStorageOptions<T> = {},
): UseStorageReturn<T> {
  // mirror upstream's `defaultWindow` fallback: resolve the window here (the
  // shared `useStorage` only re-resolves it when no explicit storage argument
  // is given) and bind it to `localStorage`
  const win = options.window ?? (typeof window === 'undefined' ? undefined : window)
  return useStorage(key, initialValue, win?.localStorage, options)
}
