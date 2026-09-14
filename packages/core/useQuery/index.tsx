import { isClient } from '@reause/shared'
import { useCallback, useEffect, useRef, useState } from 'react'

export type RouteQueryValueRaw = string | number | boolean | null | (string | number | boolean | null)[]

export interface UseQueryOptions<T, K> {
  /**
   * How a new query is written into the browser history.
   *
   * - `'replace'`: `history.replaceState` — overwrites the current history
   *   entry.
   * - `'push'`: `history.pushState` — adds a new entry, so the browser's back
   *   button returns to the previous query.
   *
   * @default 'replace'
   */
  mode?: 'replace' | 'push'

  /**
   * Function to transform data before return, or an object with one or both functions: `get` to
   * transform data before returning, and `set` to transform data before setting.
   */
  transform?:
    | ((value: T) => K)
    | ({
      get?: (value: T) => K
      set?: (value: K) => T
    })
}

/**
 * Resolve the global `window`, or `undefined` on the server. Never called during render.
 */
function getWindow(): Window | undefined {
  return typeof window === 'undefined' ? undefined : window
}

/**
 * Read `name` from `window.location.search`: a single occurrence yields the bare string, repeated
 * occurrences a `string[]`, and an absent key `undefined` (upstream reads `route.query[name]`,
 * which can also be `null`).
 */
function readRawQuery(win: Window, name: string): string | string[] | undefined {
  const params = new URLSearchParams(win.location.search)
  if (!params.has(name))
    return undefined
  const values = params.getAll(name)
  return values.length > 1 ? values : values[0]
}

export function useQuery(name: string): [undefined | null | string | string[], (value: undefined | null | string | string[]) => void]

export function useQuery<T extends RouteQueryValueRaw = string, K = T>(
  name: string,
  defaultValue?: T,
  options?: UseQueryOptions<T, K>,
): [K, (value: K) => void]

/**
 * Map from @vueuse/router `useRouteQuery`
 * (`source/vueuse/packages/router/useRouteQuery/`).
 *
 * @see https://vueuse.org/router/useRouteQuery/
 *
 * @example
 * const [page, setPage] = useQuery('page', '1')
 * console.log(page) // '2' when the URL is `?page=2`
 * setPage('2') // window.location.search becomes `?page=2`
 * setPage('1') // equals the default → the `page` key is removed
 */
export function useQuery<T extends RouteQueryValueRaw = string, K = T>(
  name: string,
  defaultValue?: T,
  options: UseQueryOptions<T, K> = {},
): [K, (value: K) => void] {
  const { mode = 'replace', transform } = options

  // upstream: `transformGet`/`transformSet` derive from the `transform`
  // option, defaulting to identity in both directions
  let transformGet = (value: T) => value as unknown as K
  let transformSet = (value: K) => value as unknown as T
  if (typeof transform === 'function') {
    transformGet = transform
  }
  else if (transform) {
    if (transform.get)
      transformGet = transform.get
    if (transform.set)
      transformSet = transform.set
  }

  // SSR-safe initial value: the URL is only read in the mount effect below, so
  // render never touches `window`
  const [value, setValueState] = useState<K>(() => defaultValue as K)

  // latest-value refs synced each render so the callbacks below stay stable
  // and always read the newest argument/options (house pattern)
  const valueRef = useRef(value)
  const nameRef = useRef(name)
  const defaultRef = useRef(defaultValue)
  const modeRef = useRef(mode)
  const transformGetRef = useRef(transformGet)
  const transformSetRef = useRef(transformSet)

  valueRef.current = value
  nameRef.current = name
  defaultRef.current = defaultValue
  modeRef.current = mode
  transformGetRef.current = transformGet
  transformSetRef.current = transformSet

  // the exposed value, straight from the URL — falling back to `defaultValue`
  // when the key is absent, with `transformGet` applied to whichever one wins
  // (upstream: `transformGet(query !== undefined ? query : toValue(defaultValue))`)
  const readQuery = useCallback((): K => {
    const win = getWindow()
    if (!win)
      return defaultRef.current as K
    const raw = readRawQuery(win, nameRef.current)
    return transformGetRef.current((raw !== undefined ? raw : defaultRef.current) as T)
  }, [])

  // commit a value read from the URL, skipping no-op updates so external
  // `hashchange` / `popstate` storms never cause a needless render
  const commit = useCallback((next: K) => {
    if (next === valueRef.current)
      return
    // update the ref eagerly: React state has not committed yet, so a second
    // call in the same tick would otherwise read a stale value
    valueRef.current = next
    setValueState(next)
  }, [])

  const setValue = useCallback((v: K) => {
    const win = getWindow()
    if (!win)
      return

    const next = transformSetRef.current(v)

    // rebuild the query from the current one so every other search param and
    // the hash survive (upstream spreads `route.query` and keeps `route.hash`)
    const url = new URL(win.location.href)
    const params = new URLSearchParams(url.search)

    if (next === defaultRef.current) {
      // equals the default → drop the key (upstream removes keys equal to the
      // default value)
      params.delete(nameRef.current)
    }
    else if (next == null) {
      // `URLSearchParams` cannot represent `null`/`undefined` — drop the key
      params.delete(nameRef.current)
    }
    else if (Array.isArray(next)) {
      params.delete(nameRef.current)
      for (const item of next) {
        if (item == null)
          continue
        params.append(nameRef.current, String(item))
      }
    }
    else {
      params.set(nameRef.current, String(next))
    }

    url.search = params.toString()

    // writing an unchanged query would only add history noise
    if (url.search !== win.location.search) {
      // `replaceState` / `pushState` never fire a `hashchange`/`popstate`
      // event, so the state below is refreshed by hand
      if (modeRef.current === 'push')
        win.history.pushState(null, '', url.href)
      else
        win.history.replaceState(null, '', url.href)
    }

    commit(readQuery())
  }, [commit, readQuery])

  useEffect(() => {
    if (!isClient)
      return

    const win = getWindow()
    if (!win)
      return

    // sync with the URL on mount: the state started at `defaultValue` because
    // render must not touch `window`
    commit(readQuery())

    const sync = () => commit(readQuery())

    // any navigation can change the search: `popstate` covers back/forward and
    // `hashchange` manual edits; `pushState` by other code fires neither
    // (matching how `useHash` handles it)
    win.addEventListener('popstate', sync)
    win.addEventListener('hashchange', sync)

    return () => {
      win.removeEventListener('popstate', sync)
      win.removeEventListener('hashchange', sync)
    }
  }, [commit, readQuery])

  // a `defaultValue` that changed across renders is re-synced while the key is
  // absent from the URL (React equivalent of upstream's reactive `toValue`)
  useEffect(() => {
    const win = getWindow()
    if (!win)
      return

    if (new URLSearchParams(win.location.search).has(name))
      return

    const next = transformGetRef.current(defaultValue as T)
    if (next !== valueRef.current)
      commit(next)
  }, [name, defaultValue, commit])

  return [value, setValue]
}
