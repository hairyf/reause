import type { ConfigurableWindow } from '@reause/shared'
import type { Dispatch, SetStateAction } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'

export type UrlParams = Record<string, string[] | string>

export interface UseUrlSearchParamsOptions<T> extends ConfigurableWindow {
  /**
   * Remove nullish values from the URL when writing back.
   *
   * @default true
   */
  removeNullishValues?: boolean

  /**
   * Remove falsy values from the URL when writing back.
   *
   * @default false
   */
  removeFalsyValues?: boolean

  /**
   * Fallback params used when the URL carries none (URL params win when present, like upstream) and
   * written back to the URL on hydration.
   *
   * @default {}
   */
  initialValue?: T

  /**
   * Write back to `window.history` automatically when the params state changes. As upstream, this
   * only gates the popstate/hashchange → state sync, not the state → URL write-back.
   *
   * @default true
   */
  write?: boolean

  /**
   * Write mode for `window.history` when `write` is enabled
   * - `replace`: replace the current history entry
   * - `push`: push a new history entry
   * @default 'replace'
   */
  writeMode?: 'replace' | 'push'

  /**
   * Custom function to serialize URL parameters. When provided, this function is used instead of
   * the default `URLSearchParams.toString()`.
   *
   * @param params The URLSearchParams object to serialize
   * @returns The serialized query string (should not include the leading '?' or '#')
   */
  stringify?: (params: URLSearchParams) => string
}

function getRawParams(win: Window, mode: 'history' | 'hash' | 'hash-params') {
  if (mode === 'history')
    return win.location.search || ''
  if (mode === 'hash') {
    const hash = win.location.hash || ''
    const index = hash.indexOf('?')
    return index > 0 ? hash.slice(index) : ''
  }
  return (win.location.hash || '').replace(/^#/, '')
}

function constructQuery(
  win: Window,
  mode: 'history' | 'hash' | 'hash-params',
  stringify: (params: URLSearchParams) => string,
  params: URLSearchParams,
) {
  const stringified = stringify(params)
  if (mode === 'history')
    return `${stringified ? `?${stringified}` : ''}${win.location.hash || ''}`
  if (mode === 'hash-params')
    return `${win.location.search || ''}${stringified ? `#${stringified}` : ''}`
  const hash = win.location.hash || '#'
  const index = hash.indexOf('?')
  if (index > 0)
    return `${win.location.search || ''}${hash.slice(0, index)}${stringified ? `?${stringified}` : ''}`
  return `${win.location.search || ''}${hash}${stringified ? `?${stringified}` : ''}`
}

/**
 * Flatten a URLSearchParams into a plain record — repeated keys become arrays, single keys become
 * strings (upstream's `updateState`).
 */
function paramsToRecord(params: URLSearchParams): Record<string, any> {
  const record: Record<string, any> = {}
  for (const key of new Set(params.keys())) {
    const values = params.getAll(key)
    record[key] = values.length > 1 ? values : (values[0] ?? '')
  }
  return record
}

/**
 * Map from @vueuse/core `useUrlSearchParams`
 * (`source/vueuse/packages/core/useUrlSearchParams/`). Reactive
 * [URLSearchParams](https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams) as a plain
 * record of params, kept in sync with the URL in `history`, `hash` or `hash-params` mode.
 *
 * React divergences:
 * - the Vue deep-reactive record becomes an immutable React state record
 *   returned as the React array tuple `[params, setParams]` — read the
 *   current record from `params` (a plain snapshot object), update it with
 *   `setParams(record)` or `setParams(prev => next)` (React `SetStateAction`
 *   forms);
 * - upstream's deep `watchPausable` write-back becomes a commit effect that
 *   serializes the record into `window.history` (`replaceState`/`pushState`
 *   per `writeMode`); state updates that come from `popstate`/`hashchange`
 *   skip the write-back since the URL already matches (upstream re-writes
 *   the same URL / skips the push there);
 * - upstream's `nextTick` coalescing becomes React's automatic batching —
 *   several `setParams` calls in one tick produce a single history write;
 * - mounting with params already on the URL applies them to state **without**
 *   writing back — upstream's mount-time hydration mutates state and its
 *   watcher pushes a duplicate history entry with `writeMode: 'push'` (the
 *   URL is authoritative: the state was just read from it, so a write-back
 *   would only duplicate the entry);
 * - in React StrictMode dev the mount effect runs twice; when `initialValue`
 *   serializes to the current URL (e.g. every value stripped as falsy) the
 *   second run re-applies it and can emit a duplicate `push` entry — prefer
 *   the default `replace` mode in dev or accept the dev-only duplicate;
 * - SSR-safe: no `window`/`location` access during render. The record
 *   hydrates from the URL in a mount effect; without a window it stays a
 *   shallow copy of `initialValue` (upstream returns `reactive(initialValue)`).
 *
 * @example
 * const [params, setParams] = useUrlSearchParams('history')
 *
 * console.log(params.foo) // 'bar'
 *
 * setParams({ ...params, foo: 'bar' })
 * // url updated to `?foo=bar`
 */
export function useUrlSearchParams<T extends Record<string, any> = UrlParams>(
  mode: 'history' | 'hash' | 'hash-params' = 'history',
  options: UseUrlSearchParamsOptions<T> = {},
): [T, Dispatch<SetStateAction<T>>] {
  const {
    initialValue = {},
    removeNullishValues = true,
    removeFalsyValues = false,
    write: enableWrite = true,
    writeMode = 'replace',
    window: windowOption,
    stringify = params => params.toString(),
  } = options

  // resolve the window without touching `window.location` — safe during
  // render and on the server; an explicit `window: null` opts out entirely
  const win = windowOption !== undefined
    ? windowOption
    : (typeof window === 'undefined' ? undefined : window)

  // latest-settings ref synced each render so the listeners/effects/proxy
  // below stay stable while always reading fresh options (house pattern)
  const settingsRef = useRef({ mode, enableWrite, writeMode, removeNullishValues, removeFalsyValues, stringify, initialValue })
  settingsRef.current = { mode, enableWrite, writeMode, removeNullishValues, removeFalsyValues, stringify, initialValue }

  // SSR-safe initial state: empty on the client (hydrated from the URL in a
  // mount effect), `initialValue` when there is no window to read from
  const [params, setParamsState] = useState<Record<string, any>>(() =>
    win ? {} : { ...initialValue },
  )
  const paramsRef = useRef(params)
  paramsRef.current = params

  // write-back guards: `lastSyncedRef` skips commits that did not change the
  // record (parent re-renders, the pre-hydration mount commit); `skipNextWrite`
  // marks records applied from the URL itself — writing them back would
  // duplicate history entries
  const lastSyncedRef = useRef(params)
  const skipNextWriteRef = useRef(false)

  const applyRecord = useCallback((record: Record<string, any>, skipWrite: boolean) => {
    paramsRef.current = record
    skipNextWriteRef.current = skipWrite
    setParamsState(record)
  }, [])

  // public setter — React `SetStateAction` forms (plain record or updater
  // function); the commit effect writes the new record back to the URL
  const setParams = useCallback((updater: SetStateAction<T>) => {
    const record = typeof updater === 'function'
      ? (updater as (prev: T) => T)(paramsRef.current as T)
      : updater
    applyRecord(record as Record<string, any>, false)
  }, [applyRecord])

  // hydrate from the current URL once (upstream's `const initial = read()`
  // tail) — params on the URL win over `initialValue`, otherwise
  // `initialValue` is applied and (like upstream's watcher) written back
  useEffect(() => {
    if (!win)
      return

    const initial = new URLSearchParams(getRawParams(win, mode))
    if (initial.keys().next().value) {
      applyRecord(paramsToRecord(initial), true)
    }
    else if (Object.keys(settingsRef.current.initialValue).length > 0) {
      applyRecord({ ...settingsRef.current.initialValue }, false)
    }
  }, [win, mode, applyRecord])

  // mirror external navigations into state (upstream: `popstate` +
  // `hashchange` listeners → `onChanged` → `write(read(), true, false)`)
  useEffect(() => {
    if (!win)
      return

    const onChanged = () => {
      const { mode: currentMode, enableWrite: currentEnableWrite } = settingsRef.current
      if (!currentEnableWrite)
        return
      applyRecord(paramsToRecord(new URLSearchParams(getRawParams(win, currentMode))), true)
    }

    win.addEventListener('popstate', onChanged, { passive: true })
    if (mode !== 'history')
      win.addEventListener('hashchange', onChanged, { passive: true })

    return () => {
      win.removeEventListener('popstate', onChanged)
      if (mode !== 'history')
        win.removeEventListener('hashchange', onChanged)
    }
  }, [win, mode, applyRecord])

  // write the committed record back into `window.history` — upstream's deep
  // `watchPausable(state, ...)` + `write(params, false)`; React batching
  // coalesces mutations in one tick into a single history write
  useEffect(() => {
    if (!win)
      return
    if (lastSyncedRef.current === params)
      return
    lastSyncedRef.current = params

    if (skipNextWriteRef.current) {
      skipNextWriteRef.current = false
      return
    }

    const {
      mode: currentMode,
      writeMode: currentWriteMode,
      removeNullishValues: currentRemoveNullishValues,
      removeFalsyValues: currentRemoveFalsyValues,
      stringify: currentStringify,
    } = settingsRef.current

    const searchParams = new URLSearchParams()
    for (const key of Object.keys(params)) {
      const value = params[key]
      if (Array.isArray(value))
        value.forEach(item => searchParams.append(key, item))
      else if (currentRemoveNullishValues && value == null)
        searchParams.delete(key)
      else if (currentRemoveFalsyValues && !value)
        searchParams.delete(key)
      else
        searchParams.set(key, value)
    }

    const url = win.location.pathname + constructQuery(win, currentMode, currentStringify, searchParams)
    if (currentWriteMode === 'replace')
      win.history.replaceState(win.history.state, win.document.title, url)
    else
      win.history.pushState(win.history.state, win.document.title, url)
  })

  // tuple return: the current record snapshot + React setter — the commit
  // effect above writes `params` back to the URL whenever it changes
  return [params as T, setParams]
}
