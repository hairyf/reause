import type { State } from '../useControllableState'
import { useCallback, useEffect, useRef } from 'react'
import { toValue, writeState } from '../utils'

export interface SyncStatesOptions {
  /**
   * Timing for syncing, same as watch's `flush` option.
   *
   * React note: there is no React equivalent — effects always run after commit, so `'sync'` /
   * `'pre'` / `'post'` are accepted for upstream signature compatibility and all behave
   * identically.
   *
   * @default 'sync'
   */
  flush?: 'sync' | 'pre' | 'post'
  /**
   * Watch deeply.
   *
   * React note: no React equivalent — a write through a setter / `onChange` updates the target only
   * on the following commit, so nested mutations cannot be observed (only the source value as a
   * whole is compared, via `Object.is`). Accepted for upstream signature compatibility.
   *
   * @default false
   */
  deep?: boolean
  /**
   * Sync values immediately (on mount).
   *
   * @default true
   */
  immediate?: boolean
}

// sentinel marking "no value observed yet" — the first effect run performs the
// initial sync, mirroring upstream's default `immediate: true`
const neverObserved = Symbol('reause.syncStates.neverObserved')

/**
 * Map from @vueuse/shared `syncRefs`
 * (`source/vueuse/packages/shared/syncRefs/`).
 *
 * @example
 * function Form() {
 *   const [source, setSource] = useState('hello')
 *   const [target, setTarget] = useState('target')
 *
 *   const stop = syncStates(source, [target, setTarget])
 *
 *   // during the first render `target` is still 'target' — the sync effect
 *   // runs after the commit, so the source reaches the target only once the
 *   // component has mounted (target === 'hello' afterwards).
 *   // Calling `setSource('foo')` re-renders and the effect then copies 'foo'
 *   // into the target state on the following commit.
 *
 *   stop()
 * }
 */
export function syncStates<T>(
  source: State<T>,
  targets: State<T> | State<T>[],
  options: SyncStatesOptions = {},
): () => void {
  const { immediate = true } = options

  // latest source flushed on every render — the effect always observes the
  // state the caller passed on this render
  const sourceRef = useRef(source)
  sourceRef.current = source

  // a `[value, setter]` tuple is itself an array — only treat the argument as
  // a targets LIST when it is not a single tuple State
  const isTupleTarget = Array.isArray(targets) && targets.length === 2 && typeof targets[1] === 'function'
  const targetsArray: State<T>[] = Array.isArray(targets) && !isTupleTarget
    ? targets
    : [targets] as State<T>[]
  const targetsRef = useRef(targetsArray)
  targetsRef.current = targetsArray

  const lastValueRef = useRef<T | symbol>(neverObserved)
  const stoppedRef = useRef(false)

  useEffect(() => {
    if (stoppedRef.current)
      return

    const value = toValue(sourceRef.current)
    const last = lastValueRef.current
    lastValueRef.current = value

    // first observation — initial sync (upstream `immediate`), unless skipped
    if (last === neverObserved) {
      if (!immediate)
        return
    }
    else if (Object.is(last, value)) {
      return
    }

    targetsRef.current.forEach((target) => {
      if (!Object.is(toValue(target), value))
        writeState(target, value)
    })
  })

  // stable `stop` — memoized so its identity survives renders (the React
  // analogue of upstream's stable watch handle)
  const stop = useCallback(() => {
    stoppedRef.current = true
  }, [])

  return stop
}
