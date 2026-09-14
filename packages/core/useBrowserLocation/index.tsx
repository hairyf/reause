import type { ConfigurableWindow } from '@reause/shared'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const WRITABLE_PROPERTIES = [
  'hash',
  'host',
  'hostname',
  'href',
  'pathname',
  'port',
  'protocol',
  'search',
] as const

export interface UseBrowserLocationOptions extends ConfigurableWindow {}

export interface BrowserLocationState {
  readonly trigger: string
  readonly state?: any
  readonly length?: number
  readonly origin?: string
  hash?: string
  host?: string
  hostname?: string
  href?: string
  pathname?: string
  port?: string
  protocol?: string
  search?: string
}

/**
 * Reactive browser location.
 *
 * Map from @vueuse/core `useBrowserLocation`
 * (`source/vueuse/packages/core/useBrowserLocation/`). Mirrors the current
 * `window.location` as a live object — read URL parts from `href`, `pathname`, `search`, `hash`...
 * and navigate by assigning a writable field. The object refreshes from the URL on `popstate` /
 * `hashchange` events and updates synchronously when a writable field is assigned (initial value
 * `trigger: 'load'`).
 *
 * 1. The Vue `Ref<BrowserLocationState>` return becomes a plain state object returned directly —
 * read `location.href`, `location.pathname`... like upstream's `state.value.*`. 2. Writable refs →
 * writable accessors: assigning a writable field (e.g. `location.hash = '#top'`) writes the value
 * back into the returned snapshot and through to `window.location[key]`, exactly like upstream's
 * ref write-back watcher (the URL write is a no-op when the value is unchanged), so the assigned
 * field reads back the written value synchronously without waiting for the next event. Read-only
 * members (`trigger`, `state`, `length`, `origin`) are getter-only. 3. The `popstate` /
 * `hashchange` listeners (passive, matching upstream) are registered in a `useEffect` with cleanup
 * and refresh the snapshot from the URL. There is no Vue scheduler flush — apart from setters the
 * state only changes from those events, so plain initialization never writes anything back to the
 * URL.
 *
 * @example
 * const location = useBrowserLocation()
 *
 * location.hash = '#top' // navigate: URL hash becomes `#top`
 * console.log(location.href)
 */
export function useBrowserLocation(options: UseBrowserLocationOptions = {}): BrowserLocationState {
  const { window: windowOption } = options

  // resolve the window without touching `window.location` — safe during
  // render and on the server; an explicit `window: null` opts out entirely
  const win = windowOption !== undefined
    ? windowOption
    : (typeof window === 'undefined' ? undefined : window)

  const buildState = useCallback((trigger: string): BrowserLocationState => {
    const { state, length } = win?.history ?? {}
    const { origin } = win?.location ?? {}

    return {
      trigger,
      state,
      length,
      origin,
      hash: win?.location?.hash,
      host: win?.location?.host,
      hostname: win?.location?.hostname,
      href: win?.location?.href,
      pathname: win?.location?.pathname,
      port: win?.location?.port,
      protocol: win?.location?.protocol,
      search: win?.location?.search,
    }
  }, [win])

  const [state, setState] = useState<BrowserLocationState>(() => buildState('load'))

  // latest-state ref synced each render so the memoized accessor object below
  // always reads the newest snapshot without being recreated on every change
  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => {
    if (!win)
      return

    const listenerOptions: AddEventListenerOptions = { passive: true }
    const onPopstate = () => setState(buildState('popstate'))
    const onHashchange = () => setState(buildState('hashchange'))

    win.addEventListener('popstate', onPopstate, listenerOptions)
    win.addEventListener('hashchange', onHashchange, listenerOptions)

    return () => {
      win.removeEventListener('popstate', onPopstate)
      win.removeEventListener('hashchange', onHashchange)
    }
  }, [win, buildState])

  // stable live mirror: getters proxy the latest state snapshot, writable fields
  // update the snapshot and write through to `window.location` (upstream's
  // write-back watcher)
  return useMemo(() => {
    const descriptors: PropertyDescriptorMap = {}

    for (const key of WRITABLE_PROPERTIES) {
      descriptors[key] = {
        enumerable: true,
        configurable: true,
        get: () => stateRef.current[key],
        set: (value: string) => {
          // write back into the returned snapshot synchronously (upstream's ref
          // write-back), so the field reads back the assigned value right away
          // instead of waiting for the next popstate/hashchange event
          if (stateRef.current[key] !== value) {
            const next: BrowserLocationState = { ...stateRef.current, [key]: value }
            stateRef.current = next
            setState(next)
          }
          if (win?.location && win.location[key] !== value) {
            ;(win.location as any)[key] = value
          }
        },
      }
    }

    for (const key of ['trigger', 'state', 'length', 'origin'] as const) {
      descriptors[key] = {
        enumerable: true,
        configurable: true,
        get: () => stateRef.current[key],
      }
    }

    return Object.defineProperties({}, descriptors) as BrowserLocationState
  }, [win])
}
