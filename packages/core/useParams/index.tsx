import { isClient } from '@reause/shared'
import { useCallback, useEffect, useRef, useState } from 'react'

export type RouteParamValueRaw = string | number | boolean | null | (string | number | boolean | null)[]

export interface UseParamsOptions<T, K> {
  /**
   * Path template used to locate the param in `window.location.pathname`, e.g. `'/users/:userId'`.
   * A segment starting with `:` captures the corresponding pathname segment; plain segments must
   * match literally. In vue-router this route config comes from the router itself, so here it has
   * to be passed explicitly — without it the hook cannot locate the param and exposes
   * `defaultValue` (it never throws).
   */
  pattern?: string

  /**
   * How a new param value is written into the browser history.
   *
   * - `'replace'`: `history.replaceState` — overwrites the current history
   *   entry.
   * - `'push'`: `history.pushState` — adds a new entry, so the browser's back
   *   button returns to the previous path.
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
 * Decode a captured path segment, falling back to the raw segment when the browser hands us a
 * malformed percent-encoding (`decodeURIComponent` throws on input like `'100%'`).
 */
function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment)
  }
  catch {
    return segment
  }
}

/**
 * Match `pathname` against the `pattern` path template: a pattern segment starting with `:`
 * captures the corresponding pathname segment (decoded), a plain segment must match literally, and
 * both sides need the same number of segments. The value of every `:name` capture is collected, so
 * a repeated `:name` in the pattern yields a `string[]`; a single occurrence yields the bare
 * string, and a mismatch (or an absent pattern) is `undefined`.
 */
function readRawParam(win: Window, name: string, pattern: string | undefined): string | string[] | undefined {
  if (!pattern)
    return undefined

  const patternSegments = pattern.split('/')
  const pathSegments = win.location.pathname.split('/')
  if (patternSegments.length !== pathSegments.length)
    return undefined

  const found: string[] = []
  for (let i = 0; i < patternSegments.length; i++) {
    const segment = patternSegments[i]
    if (segment.startsWith(':')) {
      if (segment.slice(1) === name)
        found.push(decodeSegment(pathSegments[i]))
    }
    else if (segment !== pathSegments[i]) {
      return undefined
    }
  }

  return found.length > 1 ? found : found[0]
}

export function useParams(name: string): [null | string | string[], (value: null | string | string[]) => void]

export function useParams<T extends RouteParamValueRaw = string, K = T>(
  name: string,
  defaultValue?: T,
  options?: UseParamsOptions<T, K>,
): [K, (value: K) => void]

/**
 * Shorthand for a reactive path parameter, read from `window.location.pathname` against a `pattern`
 * path template.
 *
 * Map from @vueuse/router `useRouteParams`
 * (`source/vueuse/packages/router/useRouteParams/`), which proxies
 * `route.params[name]` through vue-router. Here `window.location.pathname` is the single source of
 * truth, so the router dependency is dropped entirely: the hook reads and writes `window.location`
 * / `history` directly.
 *
 * Reading:
 *
 * - `pattern` is the route config that vue-router would otherwise own — a path
 *   template (`'/users/:userId'`) whose `:name` segments capture the matching
 *   `window.location.pathname` segment. Plain segments must match literally.
 *   Without a `pattern` the hook cannot locate the param, so it exposes
 *   `defaultValue` (upstream throws without a matching route; here it never
 *   throws).
 * - A present capture is the decoded segment: the bare string, or a `string[]` when the same
 * `:name` repeats in the pattern. An absent or empty (`''`) capture counts as missing and falls
 * back to `defaultValue`. A `pattern` that does not match the current pathname also yields
 * `defaultValue`.
 * - The `transformGet` (default identity) applies to whichever value wins.
 * - Writing. A value strictly equal to `defaultValue` — or `null` — removes the param instead (the
 * segment is emptied; upstream stores `undefined`). The current search and hash are preserved.
 *
 * 1. The `route` / `router` options are gone — `window.location.pathname` and `history` are the
 * driver, and `mode` picks `history.replaceState` (default, mirroring upstream's `'replace'`) or
 * `history.pushState`. 2. The value is React state rather than a `customRef`, so it settles on the
 * next render after `setValue` instead of upstream's synchronous `trigger()`; the URL write itself
 * is still synchronous. 3. Neither `replaceState` nor `pushState` fires a `hashchange`/`popstate`
 * event, so the setter refreshes its own state. `popstate` (back/forward) and `hashchange` (manual
 * edits, anchor navigation) are subscribed in an effect and removed on unmount. `pushState` by
 * other code fires neither, matching how `useHash` handles it. 4. Upstream batches multi-key writes
 * per tick through a queue and pushes a single router navigation; here each `setValue` performs its
 * own history update immediately. 5. There is no multi-page router context to resolve — the hook is
 * scoped to the current `window.location` only. 6. SSR-safe: render never touches `window` (state
 * starts at `defaultValue`), the URL is first read in a mount effect, and `setValue` is a no-op
 * without a `window` — or without a `pattern` to place the value in. 7. A `defaultValue` that
 * changes across renders is re-synced while the capture is absent or empty (the React equivalent of
 * upstream's reactive `toValue(defaultValue)`).
 *
 * @see https://vueuse.org/router/useRouteParams/
 *
 * @example
 * const [userId, setUserId] = useParams('userId', '', { pattern: '/users/:userId' })
 * console.log(userId) // '42' when the URL is `/users/42`
 * setUserId('7') // window.location.pathname becomes `/users/7`
 * setUserId('') // equals the default → the param is removed (`/users/`)
 */
export function useParams<T extends RouteParamValueRaw = string, K = T>(
  name: string,
  defaultValue?: T,
  options: UseParamsOptions<T, K> = {},
): [K, (value: K) => void] {
  const { mode = 'replace', pattern, transform } = options

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
  const patternRef = useRef(pattern)
  const modeRef = useRef(mode)
  const transformGetRef = useRef(transformGet)
  const transformSetRef = useRef(transformSet)

  valueRef.current = value
  nameRef.current = name
  defaultRef.current = defaultValue
  patternRef.current = pattern
  modeRef.current = mode
  transformGetRef.current = transformGet
  transformSetRef.current = transformSet

  // the exposed value, straight from the URL — falling back to `defaultValue`
  // when the capture is missing or empty, with `transformGet` applied to
  // whichever one wins (upstream: `transformGet(param !== undefined &&
  // param !== '' ? param : toValue(defaultValue))`)
  const readValue = useCallback((): K => {
    const win = getWindow()
    if (!win)
      return defaultRef.current as K
    const raw = readRawParam(win, nameRef.current, patternRef.current)
    return transformGetRef.current((raw !== undefined && raw !== '' ? raw : defaultRef.current) as T)
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

    // without a pattern there is no template to place the value in — no-op
    // (the hook never throws)
    const template = patternRef.current
    if (!template)
      return

    const next = transformSetRef.current(v)

    // rebuild the path from the pattern, emptying the `:name` segments when
    // the value equals the default or is `null` (upstream stores `undefined`),
    // and preserve the current search + hash (upstream keeps `route.query`
    // and `route.hash`)
    const url = new URL(win.location.href)
    const removed = next == null || next === defaultRef.current
    url.pathname = template
      .split('/')
      .map(segment => segment === `:${nameRef.current}` ? (removed ? '' : encodeURIComponent(String(next))) : segment)
      .join('/')

    // writing an unchanged path would only add history noise
    if (url.pathname !== win.location.pathname) {
      // `replaceState` / `pushState` never fire a `hashchange`/`popstate`
      // event, so the state below is refreshed by hand
      if (modeRef.current === 'push')
        win.history.pushState(null, '', url.href)
      else
        win.history.replaceState(null, '', url.href)
    }

    commit(readValue())
  }, [commit, readValue])

  useEffect(() => {
    if (!isClient)
      return

    const win = getWindow()
    if (!win)
      return

    // sync with the URL on mount: the state started at `defaultValue` because
    // render must not touch `window`
    commit(readValue())

    const sync = () => commit(readValue())

    // any navigation can change the pathname: `popstate` covers back/forward
    // and `hashchange` manual edits; `pushState` by other code fires neither
    // (matching how `useHash` handles it)
    win.addEventListener('popstate', sync)
    win.addEventListener('hashchange', sync)

    return () => {
      win.removeEventListener('popstate', sync)
      win.removeEventListener('hashchange', sync)
    }
  }, [commit, readValue])

  // a `defaultValue` that changed across renders is re-synced while the
  // capture is absent or empty (React equivalent of upstream's reactive
  // `toValue`)
  useEffect(() => {
    const win = getWindow()
    if (!win)
      return

    const raw = readRawParam(win, name, pattern)
    if (raw !== undefined && raw !== '')
      return

    const next = transformGetRef.current(defaultValue as T)
    if (next !== valueRef.current)
      commit(next)
  }, [name, defaultValue, pattern, commit])

  return [value, setValue]
}
