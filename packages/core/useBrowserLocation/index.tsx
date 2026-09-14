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
 * Map from @vueuse/core `useBrowserLocation`
 * (`source/vueuse/packages/core/useBrowserLocation/`).
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
