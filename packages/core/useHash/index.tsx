import { isClient } from '@reause/shared'
import { useCallback, useEffect, useRef, useState } from 'react'

export interface UseHashOptions {
  /**
   * How a new hash is written into the browser history.
   *
   * - `'replace'`: `history.replaceState` — overwrites the current history
   *   entry.
   * - `'push'`: `history.pushState` — adds a new entry, so the browser's back
   *   button returns to the previous hash.
   *
   * @default 'replace'
   */
  mode?: 'replace' | 'push'
}

export type UseHashReturn = [
  hash: string,
  setHash: (value: string) => void,
]

/**
 * Resolve the global `window`, or `undefined` on the server. Never called during render.
 */
function getWindow(): Window | undefined {
  return typeof window === 'undefined' ? undefined : window
}

/**
 * Normalise a hash for the URL: `window.location.hash` always keeps a leading `#`, so `'foobar'`
 * becomes `'#foobar'` while an already-prefixed `'#foobar'` is left untouched. An empty string —
 * and the bare `'#'`, which the browser canonicalises to an empty fragment anyway — clears the
 * hash.
 */
function normaliseHash(value: string): string {
  if (!value || value === '#')
    return ''
  return value.startsWith('#') ? value : `#${value}`
}

/**
 * Shorthand for a reactive `window.location.hash`.
 *
 * Map from @vueuse/router `useRouteHash`
 * (`source/vueuse/packages/router/useRouteHash/`), which proxies `route.hash`
 * through the router. Here the document hash is the single source of truth, so the router
 * dependency is dropped entirely: the hook reads and writes `window.location` / `history` directly.
 *
 * Hash normalisation:
 *
 * - Reading mirrors upstream's `route.hash || toValue(defaultValue)`: while a fragment is present
 * the value is `window.location.hash`, which always keeps its leading `#` (`'#foobar'`). When the
 * fragment is empty `defaultValue` is exposed verbatim, so `useHash('baz')` exposes `'baz'` — and
 * `''` when no default was given (upstream exposes `undefined`).
 * - Writing normalises the leading `#`: `setHash('foobar')` writes `#foobar`.
 *   Two adjacent `#` are not collapsed (`setHash('#foobar')` also writes
 *   `#foobar`). The exposed value is then read back from `window.location`, so
 *   any canonicalisation the browser applies (percent-encoding, removal of a
 *   bare `#`) is reflected in the state as well.
 *
 * 1. The `route` / `router` options are gone — `window.location` and `history` are the driver, and
 * `mode` picks `history.replaceState` (default, mirroring upstream's `'replace'`) or
 * `history.pushState`. 2. `hash` is React state rather than a `customRef`, so it settles on the
 * next render after `setHash` instead of upstream's synchronous `trigger()`; the URL write itself
 * is still synchronous. 3. Neither `replaceState` nor `pushState` fires a `hashchange` event, so
 * the setter refreshes its own state. `hashchange` (manual edits, anchor navigation) and `popstate`
 * (back/forward over `mode: 'push'` entries) are subscribed in an effect and removed on unmount. 4.
 * SSR-safe: render never touches `window` (state starts at `defaultValue`), the URL is first read
 * in a mount effect, and `setHash` is a no-op without a `window`. 5. A `defaultValue` that changes
 * across renders is re-synced while the fragment is empty (the React equivalent of upstream's
 * reactive `toValue(defaultValue)`).
 *
 * @see https://vueuse.org/router/useRouteHash/
 *
 * @example
 * const [hash, setHash] = useHash()
 * console.log(hash) // '#foobar'
 * setHash('foobar') // window.location.hash becomes '#foobar'
 */
export function useHash(defaultValue?: string, options: UseHashOptions = {}): UseHashReturn {
  const { mode = 'replace' } = options

  // SSR-safe initial value: the URL is only read in the mount effect below, so
  // render never touches `window`.
  const [hash, setHashState] = useState<string>(() => defaultValue ?? '')

  // latest-value refs synced each render so the callbacks below stay stable
  // and always read the newest argument/options (house pattern)
  const hashRef = useRef(hash)
  const defaultRef = useRef(defaultValue)
  const modeRef = useRef(mode)

  hashRef.current = hash
  defaultRef.current = defaultValue
  modeRef.current = mode

  // the exposed value, straight from the URL — falling back to `defaultValue`
  // when the fragment is empty (upstream: `route.hash || toValue(defaultValue)`)
  const readHash = useCallback((): string => {
    const win = getWindow()
    if (!win)
      return defaultRef.current ?? ''
    return win.location.hash || defaultRef.current || ''
  }, [])

  // commit a value read from the URL, skipping no-op updates so external
  // `hashchange` / `popstate` storms never cause a needless render
  const commit = useCallback((next: string) => {
    if (next === hashRef.current)
      return
    // update the ref eagerly: React state has not committed yet, so a second
    // call in the same tick would otherwise read a stale value
    hashRef.current = next
    setHashState(next)
  }, [])

  const setHash = useCallback((value: string) => {
    const win = getWindow()
    if (!win)
      return

    const next = normaliseHash(value)

    // writing the same fragment again would only add history noise
    if (win.location.hash !== next) {
      const url = new URL(win.location.href)
      url.hash = next
      // `replaceState` / `pushState` never fire a `hashchange` event, so the
      // state below is refreshed by hand
      if (modeRef.current === 'push')
        win.history.pushState(win.history.state, '', url.href)
      else
        win.history.replaceState(win.history.state, '', url.href)
    }

    commit(readHash())
  }, [commit, readHash])

  useEffect(() => {
    if (!isClient)
      return

    const win = getWindow()
    if (!win)
      return

    // sync with the URL on mount: the state started at `defaultValue` because
    // render must not touch `window`
    commit(readHash())

    const sync = () => commit(readHash())

    // `hashchange` covers manual edits and anchor navigation; `popstate`
    // covers back/forward over entries created by `mode: 'push'`, which does
    // not fire `hashchange` on its own
    win.addEventListener('hashchange', sync)
    win.addEventListener('popstate', sync)

    return () => {
      win.removeEventListener('hashchange', sync)
      win.removeEventListener('popstate', sync)
    }
  }, [commit, readHash])

  // a `defaultValue` that changed across renders is re-synced while the
  // fragment is empty (React equivalent of upstream's reactive `toValue`)
  useEffect(() => {
    const win = getWindow()
    if (win?.location.hash)
      return

    const next = defaultValue ?? ''
    if (next !== hashRef.current)
      commit(next)
  }, [defaultValue, commit])

  return [hash, setHash]
}
