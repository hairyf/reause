import type { UseStorageOptions, UseStorageReturn } from '../useStorage'
import { useStorage } from '../useStorage'

export function useSessionStorage(key: string, initialValue: string, options?: UseStorageOptions<string>): UseStorageReturn<string>
export function useSessionStorage(key: string, initialValue: boolean, options?: UseStorageOptions<boolean>): UseStorageReturn<boolean>
export function useSessionStorage(key: string, initialValue: number, options?: UseStorageOptions<number>): UseStorageReturn<number>
export function useSessionStorage<T>(key: string, initialValue: T | (() => T), options?: UseStorageOptions<T>): UseStorageReturn<T>
export function useSessionStorage<T = unknown>(key: string, initialValue: null, options?: UseStorageOptions<T>): UseStorageReturn<T>

/**
 * Map from @vueuse/core `useSessionStorage`
 * (`source/vueuse/packages/core/useSessionStorage/`), which is a thin wrapper
 * over `useStorage` bound to `window.sessionStorage`. Reactive
 * [SessionStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage) — the
 * value is persisted under `key`, re-read on mount and key change, and kept in sync across hook
 * instances sharing the same key.
 *
 * This hook has **no logic of its own** — it is a thin wrapper delegating to `useStorage` (already
 * ported) with `window.sessionStorage` as the backend: `useStorage(key, initialValue,
 * window.sessionStorage, options)`. All serialization (type-guessed `StorageSerializers` or a
 * custom `serializer`), `writeDefaults` / `mergeDefaults`, same-document sync through synthetic
 * `storage` events and `onError` handling live in `useStorage`, mirroring upstream where
 * `useSessionStorage` calls `useStorage(key, initialValue, window?.sessionStorage, options)`.
 *
 * React divergences (inherited from `useStorage`):
 * - the Vue `RemovableRef<T>` return becomes a `useState`-backed tuple
 *   `[value, setValue]`; the setter also accepts a function updater.
 *   `setValue(null)` removes the entry from storage and the state falls back
 *   to the initial value (mirroring upstream, where the self storage-event
 *   echo restores `rawInit`);
 * - storage is never touched during render: the first read happens in the
 *   mount effect, so SSR renders the initial value and the stored value
 *   replaces it after hydration;
 * - `key` is a plain React string that can change between renders — a key
 *   change re-reads the new key (upstream takes a reactive
 *   `MaybeRefOrGetter` key). Writes always go to the key of the current
 *   render, and when `writeDefaults` is on, a new key with no stored value is
 *   seeded with the initial value;
 * - Vue reactivity options have no React equivalent and are omitted:
 *   `flush`/`deep`/`eventFilter` (writes happen synchronously inside
 *   `setValue`), `shallow` (React state is replaced wholesale) and
 *   `initOnMounted` (effectively always on — the first read happens in the
 *   mount effect).
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
