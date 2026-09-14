import type { RefObject } from 'react'
import type { StorageLike, UseStorageOptions } from '../useStorage'
import { useCallback, useEffect, useRef, useState } from 'react'
import { unrefElement } from '../unrefElement'
import { usePreferredDark } from '../usePreferredDark'
import { useStorage } from '../useStorage'

export type BasicColorMode = 'light' | 'dark'
export type BasicColorSchema = BasicColorMode | 'auto'

export interface UseColorModeOptions<T extends string = BasicColorMode> extends UseStorageOptions<T | BasicColorMode> {
  /**
   * CSS Selector for the target element applying to, or a React ref object (`RefObject`) holding
   * that element (upstream's `ElementRef`).
   *
   * @default 'html'
   */
  selector?: string | RefObject<HTMLElement | null>

  /**
   * HTML attribute applying the target element
   *
   * @default 'class'
   */
  attribute?: string

  /**
   * The initial color mode
   *
   * @default 'auto'
   */
  initialValue?: T | BasicColorSchema

  /**
   * Prefix when adding value to the attribute
   */
  modes?: Partial<Record<T | BasicColorSchema, string>>

  /**
   * A custom handler for handle the updates. When specified, the default behavior will be
   * overridden.
   *
   * @default undefined
   */
  onChanged?: (mode: T | BasicColorMode, defaultHandler: ((mode: T | BasicColorMode) => void)) => void

  /**
   * Custom storage ref
   *
   * When provided, the persistence layer is skipped entirely — no localStorage read/write and no
   * storage-event listener (`useStorage` is still called internally for the rules of hooks, backed
   * by an inert in-memory storage). A `null` `storageRef.current` falls back to `initialValue`.
   */
  storageRef?: RefObject<T | BasicColorSchema>

  /**
   * Key to persist the data into localStorage/sessionStorage.
   *
   * Pass `null` to disable persistence
   *
   * @default 'vueuse-color-scheme'
   */
  storageKey?: string | null

  /**
   * Storage object, can be localStorage or sessionStorage
   */
  storage?: StorageLike

  /**
   * Emit `auto` mode from state
   *
   * When set to `true`, preferred mode won't be translated into `light` or `dark`. This is useful
   * when the fact that `auto` mode was selected needs to be known.
   *
   * @default undefined
   * @deprecated use the stored value when `auto` mode needs to be known
   * @see https://vueuse.org/core/useColorMode/#advanced-usage
   */
  emitAuto?: boolean

  /**
   * Disable transition on switch
   *
   * @see https://paco.me/writing/disable-theme-transitions
   * @default true
   */
  disableTransition?: boolean
}

export type UseColorModeReturn<T extends string = BasicColorMode> = [
  mode: T | BasicColorSchema,
  setMode: (mode: T | BasicColorSchema) => void,
]

const CSS_DISABLE_TRANS = '*,*::before,*::after{-webkit-transition:none!important;-moz-transition:none!important;-o-transition:none!important;-ms-transition:none!important;transition:none!important}'

// Inert `StorageLike` backend — `useStorage` must always be called (rules of
// hooks forbid conditional calls), so it is backed by this no-op storage
// whenever persistence is disabled (`storageKey: null`) or replaced by a
// custom `storageRef`; nothing is ever read from or written to real storage.
const inertStorage: StorageLike = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
}

/**
 * Reactive color mode (dark / light / customs) with auto data persistence — React
 * port of VueUse's `useColorMode`.
 *
 * Map from @vueuse/core `useColorMode`
 * (`source/vueuse/packages/core/useColorMode/`), which composes
 * `useStorage` + `usePreferredDark` and keeps the `html` (or a custom target) element's
 * `class`/attribute in sync with the resolved mode. By default the mode starts `auto` — matching
 * the user's browser preference through `usePreferredDark` — and is persisted under the
 * `storageKey` ('vueuse-color-scheme') in `localStorage` (or a custom `storage`). Writing
 * `dark`/`light`/custom modes persists them and updates the DOM; writing `auto` switches back to
 * following the system preference.
 *
 * React divergences:
 * - the Vue `Ref<T | BasicColorSchema> & { store, system, state }` return
 *   becomes a `useState`-backed tuple `[mode, setMode]` — `mode` is the
 *   resolved mode ('dark' | 'light' | 'auto' with `emitAuto`, or custom
 *   modes), `setMode` writes and persists it. The `store` (raw persisted
 *   value) and `system` (raw system preference) surfaces are not exposed —
 *   the storage key can be read directly and `usePreferredDark` composes, and
 *   `mode` already reflects both through the `auto` translation;
 * - the DOM `class`/attribute update and the initial storage read run in a `useEffect` (upstream's
 * `watch(state..., { immediate: true })` + `tryOnMounted`), so SSR renders the translated
 * `initialValue` and only touches `window`/`document`/storage after mount. `state` changes only
 * re-run the effect when the resolved mode actually changed (upstream's `flush: 'post'` watch);
 * - options are captured once at mount (upstream destructures them once at
 *   setup) — changing them between renders has no effect;
 * - `initialValue` is resolved once at mount; `storageRef` accepts a
 *   ref-like `{ current }` object as the external store, mirroring upstream's
 *   `Ref` — writes go to `storageRef.current` and trigger a re-render through
 *   internal state, and the current value is re-read on every render. When
 *   `storageRef` is provided the persistence layer is skipped entirely (no
 *   localStorage read/write, no storage-event listener); a `null`
 *   `storageRef.current` falls back to `initialMode`, whereas upstream's raw
 *   `store.value` passthrough would expose `null`;
 * - `selector` accepts a string (queried on every update) or a React ref object (`RefObject`)
 * holding the target element (upstream's `ElementRef`).
 *
 * @example
 * const [mode, setMode] = useColorMode()
 *
 * setMode('dark') // change to dark mode and persist
 * setMode('auto') // switch back to auto mode
 *
 * @see https://vueuse.org/core/useColorMode/
 */
export function useColorMode<T extends string = BasicColorMode>(
  options: UseColorModeOptions<T> = {},
): UseColorModeReturn<T> {
  // captured once at mount — mirrors upstream's one-time options destructuring
  const optionsRef = useRef(options)
  const opts = optionsRef.current

  const {
    selector = 'html',
    attribute = 'class',
    initialValue = 'auto',
    window: win = typeof window === 'undefined' ? undefined : window,
    storage,
    storageKey = 'vueuse-color-scheme',
    listenToStorageChanges = true,
    storageRef,
    emitAuto,
    disableTransition = true,
  } = opts

  const modes = {
    auto: '',
    light: 'light',
    dark: 'dark',
    ...opts.modes || {},
  } as Record<BasicColorSchema | T, string>

  // resolved once at mount (upstream resolves the source at setup)
  const initialModeRef = useRef<T | BasicColorSchema | undefined>(undefined)
  initialModeRef.current ??= initialValue as T | BasicColorSchema
  const initialMode = initialModeRef.current

  const preferredDark = usePreferredDark({ window: win })
  const system: BasicColorMode = preferredDark ? 'dark' : 'light'

  // `storageRef` replaces the whole persistence layer (upstream's
  // `storageRef || ...` short-circuit): `useStorage` is still called
  // unconditionally (rules of hooks), but against the inert backend with
  // `writeDefaults: false` + `listenToStorageChanges: false`, so no real
  // localStorage is read or written and no storage-event listener is added.
  // `storageKey: null` is likewise backed by the inert storage.
  const [stored, setStored] = useStorage<T | BasicColorSchema>(
    storageKey ?? 'reause-use-color-mode',
    initialMode,
    storageKey == null || storageRef ? inertStorage : storage,
    storageRef
      ? { window: win, writeDefaults: false, listenToStorageChanges: false }
      : { window: win, listenToStorageChanges },
  )
  // local (non-persisted) mode, used only when `storageKey: null`
  const [plainStore, setPlainStore] = useState<T | BasicColorSchema>(initialMode)
  // re-render nudge for the `storageRef` path: the external value lives on the
  // ref and is re-read on every render, so only a state bump is needed for a
  // write through `setMode` to be observed
  const [, setStoreVersion] = useState(0)

  const usePersistedStore = storageKey != null && !storageRef
  const store = (usePersistedStore ? stored : (storageRef ? storageRef.current : plainStore)) ?? initialMode

  const setMode = useCallback((mode: T | BasicColorSchema) => {
    if (storageRef) {
      storageRef.current = mode
      setStoreVersion(v => v + 1)
    }
    else if (storageKey == null) {
      setPlainStore(mode)
    }
    else {
      setStored(mode)
    }
  }, [storageRef, storageKey, setStored])

  // translated mode — `auto` resolves to the current system preference
  const state: T | BasicColorMode = store === 'auto' ? system : store
  const mode = emitAuto ? store : state

  // the DOM update mirrors upstream's `watch(state, onChanged, { flush:
  // 'post', immediate: true })` + `tryOnMounted(() => onChanged(state.value))`
  useEffect(() => {
    if (!win)
      return

    const el = typeof selector === 'string'
      ? win.document.querySelector(selector)
      : unrefElement(selector)
    if (!el)
      return

    const updateHTMLAttrs = (value: string): void => {
      const classesToAdd = new Set<string>()
      const classesToRemove = new Set<string>()
      let attributeToChange: { key: string, value: string } | null = null

      if (attribute === 'class') {
        const current = value.split(/\s/g)
        Object.values(modes)
          .flatMap(i => (i || '').split(/\s/g))
          .filter(Boolean)
          .forEach((v) => {
            if (current.includes(v))
              classesToAdd.add(v)
            else
              classesToRemove.add(v)
          })
      }
      else {
        attributeToChange = { key: attribute, value }
      }

      if (classesToAdd.size === 0 && classesToRemove.size === 0 && attributeToChange === null)
        // Nothing changed so we can avoid reflowing the page
        return

      let style: HTMLStyleElement | undefined
      if (disableTransition) {
        style = win.document.createElement('style')
        style.appendChild(win.document.createTextNode(CSS_DISABLE_TRANS))
        win.document.head.appendChild(style)
      }

      for (const c of classesToAdd)
        el.classList.add(c)
      for (const c of classesToRemove)
        el.classList.remove(c)
      if (attributeToChange)
        el.setAttribute(attributeToChange.key, attributeToChange.value)

      if (disableTransition) {
        // Calling getComputedStyle forces the browser to redraw
        const _ = win.getComputedStyle(style!).opacity
        win.document.head.removeChild(style!)
      }
    }

    const defaultOnChanged = (mode: T | BasicColorMode): void => {
      updateHTMLAttrs(modes[mode] ?? mode)
    }

    if (opts.onChanged)
      opts.onChanged(state, defaultOnChanged)
    else
      defaultOnChanged(state)
  }, [state])

  return [mode, setMode]
}
