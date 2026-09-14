import type { State } from '@reause/shared'
import type { Dispatch, SetStateAction } from 'react'
import { deepClone, deepEqual, toValue } from '@reause/shared'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export interface UseClonedOptions<T = any> {
  /**
   * Custom clone function.
   *
   * By default, it use `JSON.parse(JSON.stringify(value))` to clone.
   */
  clone?: (source: T) => T

  /**
   * Manually sync the clone — only `sync()` re-clones from the source.
   *
   * @default false
   */
  manual?: boolean

  /**
   * Track changes inside the source value, not only reference replacements. When `false`, a new
   * reference is needed to re-sync — in-place mutations are ignored.
   *
   * @default true
   */
  deep?: boolean

  /**
   * Sync the clone on mount.
   *
   * @default true
   */
  immediate?: boolean
}

export type UseClonedReturn<T> = readonly [
  /**
   * Cloned value — React state holding a (deep) copy of the source.
   */
  cloned: T,
  /**
   * Replace the clone state with the React immutable-update protocol: `setCloned(next)` or
   * `setCloned(prev => next)`. It does not re-sync from the source — use `controls.sync()` for
   * that.
   */
  setCloned: Dispatch<SetStateAction<T>>,
  controls: {
    /**
     * Whether the cloned value has been modified since the last sync.
     */
    isModified: boolean
    /**
     * Sync cloned data with source manually
     */
    sync: () => void
  },
]

export type CloneFn<F, T = F> = (x: F) => T

export function cloneFnJSON<T>(source: T): T {
  return JSON.parse(JSON.stringify(source))
}

/**
 * Whether a `State<T>` source is reactive — getters, `[value, setter]` tuples and `{ value,
 * onChange }` pairs can all change without the caller passing a new plain value. A plain value is
 * static for the lifetime of the hook unless the caller re-renders with a new one; a React ref is
 * **not** a state source (it is a DOM handle, read with `unrefElement` in DOM hooks), so a `{
 * current }` object is treated as an ordinary plain value.
 */
function isReactiveState<T>(source: State<T>): boolean {
  if (typeof source === 'function')
    return true
  if (Array.isArray(source) && source.length === 2 && typeof source[1] === 'function')
    return true
  return typeof source === 'object'
    && source !== null
    && !Array.isArray(source)
    && 'value' in source
    // mirrors `toValue`: a DOM-like `{ value }` (an input element) is a plain
    // value, not a `{ value, onChange }` state pair
    && !('addEventListener' in source)
}

/**
 * Map from @vueuse/core `useCloned`
 * (`source/vueuse/packages/core/useCloned/`).
 *
 * @example
 * const [cloned, setCloned, { isModified, sync }] = useCloned(original)
 *
 * setCloned({ key: 'new value' }) // isModified → true
 * setCloned(prev => ({ ...prev, key: 'another' })) // functional update
 * sync() // re-clone from the source, isModified back to false
 */
export function useCloned<T>(
  source: State<T>,
  options: UseClonedOptions<T> = {},
): UseClonedReturn<T> {
  // upstream destructures its options once at setup — captured here the same
  // way (a changing `options` object between renders does not re-wire the hook)
  const optionsRef = useRef(options)
  const {
    manual = false,
    clone = cloneFnJSON,
    deep = true,
    immediate = true,
  } = optionsRef.current

  // latest source synced each render so the stable `sync` callback always
  // reads the newest source (house pattern)
  const sourceRef = useRef(source)
  sourceRef.current = source

  // upstream: `cloned` initializes as `{}` and is filled right away by the
  // immediate watch — or by the unconditional setup `sync()` for `manual` /
  // plain-value sources. With `immediate: false` no initial sync happens and
  // `cloned` keeps the empty initial value
  const isReactiveSource = isReactiveState(source)
  const initialSync = manual || !isReactiveSource || immediate

  const [cloned, setClonedState] = useState<T>(() => {
    if (!initialSync)
      return {} as T
    return clone(toValue(sourceRef.current))
  })
  const [isModified, setIsModified] = useState(false)

  // latest clone state — the wrapped `setCloned` resolves functional updaters
  // against this, so consecutive calls in one handler compose correctly
  const clonedRef = useRef(cloned)
  clonedRef.current = cloned

  // isolated baselines for the two detectors below — deep copies, so an
  // in-place mutation of the live source (or of `cloned`) stays visible to
  // the comparison. `deep: false` compares source references, which is safe
  // against a shared baseline by design (mutations must NOT re-sync)
  const sourceBaselineRef = useRef<T>(undefined as unknown as T)
  const clonedBaselineRef = useRef<T>(undefined as unknown as T)
  const baselineInitRef = useRef(false)
  if (!baselineInitRef.current) {
    baselineInitRef.current = true
    clonedBaselineRef.current = deepClone(cloned)
    sourceBaselineRef.current = deep
      ? deepClone(toValue(sourceRef.current))
      : toValue(sourceRef.current)
  }

  const sync = useCallback(() => {
    const current = toValue(sourceRef.current)
    const next = clone(current)
    // refresh the isolated baselines so the next render sees an unmodified
    // clone and an up-to-date source (upstream: `_lastSync` flag)
    sourceBaselineRef.current = deep ? deepClone(current) : current
    clonedBaselineRef.current = deepClone(next)
    clonedRef.current = next
    setClonedState(next)
    setIsModified(false)
  }, [clone, deep])

  // idiomatic modification path (React immutable updates): replace the clone
  // without re-syncing from the source, and keep `isModified` in sync by
  // comparing the new value against the last synced baseline (`deepEqual` for
  // `deep: true`, `Object.is` for `deep: false`)
  const setCloned = useCallback<Dispatch<SetStateAction<T>>>((action) => {
    const prev = clonedRef.current
    const next = typeof action === 'function' ? (action as (value: T) => T)(prev) : action
    clonedRef.current = next
    setClonedState(next)
    const changed = deep
      ? !deepEqual(next, clonedBaselineRef.current)
      : !Object.is(next, clonedBaselineRef.current)
    setIsModified(changed)
  }, [deep])

  // legacy fallback for in-place mutation (upstream: `watch(cloned, cb,
  // { deep: true, flush: 'sync' })`) — `setCloned` is the idiomatic path and
  // already maintains `isModified`; this render-time comparison keeps
  // mutating `cloned` directly working, since React cannot observe an
  // in-place mutation except by re-comparing on a re-render
  useEffect(() => {
    if (!deepEqual(cloned, clonedBaselineRef.current))
      setIsModified(true)
  })

  // source watcher (upstream: `watch(source, sync, { deep, immediate })`) —
  // re-sync whenever the resolved source changed since the last sync:
  // structural comparison for `deep: true`, reference comparison for `false`
  useEffect(() => {
    if (manual)
      return
    const value = toValue(sourceRef.current)
    const changed = deep
      ? !deepEqual(value, sourceBaselineRef.current)
      : !Object.is(value, sourceBaselineRef.current)
    if (changed)
      sync()
  })

  // stable controls object — new identity only when its members change
  const controls = useMemo(() => ({ isModified, sync }), [isModified, sync])

  return [cloned, setCloned, controls]
}
