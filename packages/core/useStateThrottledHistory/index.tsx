import type { State } from '@reause/shared'
import type { Dispatch, SetStateAction } from 'react'
import type { UseRefHistoryRecord } from '../useStateManualHistory'
import { useControllableState } from '@reause/shared'
import { useCallback, useEffect, useRef, useState } from 'react'

export interface UseStateThrottledHistoryOptions<Raw, Serialized = Raw> {
  /**
   * Maximum number of history to be kept. Default to unlimited.
   */
  capacity?: number
  /**
   * Clone when taking a snapshot, shortcut for dump: JSON.parse(JSON.stringify(value)).
   *
   * @default false
   */
  clone?: boolean | ((value: Raw) => Raw)
  /**
   * Serialize data into the history
   */
  dump?: (value: Raw) => Serialized
  /**
   * Deserialize data from the history
   */
  parse?: (value: Serialized) => Raw
  /**
   * Throttle duration in milliseconds between history commits — re-read on every change, so passing
   * the current value of a state works naturally.
   *
   * @default 200
   */
  throttle?: number
  /**
   * Commit the latest change on the trailing edge of the throttle window. When `false`, changes
   * inside the window are dropped instead of collapsing into a trailing commit.
   *
   * @default true
   */
  trailing?: boolean
}

export interface UseStateThrottledHistoryControls<Raw, Serialized = Raw> {
  /**
   * Mirror of the source state passed to the hook
   */
  source: Raw

  /**
   * Last history point, the source can be restored to it with `reset()`
   */
  last: UseRefHistoryRecord<Serialized>

  /**
   * History records for undo, newest comes first
   */
  undoStack: UseRefHistoryRecord<Serialized>[]

  /**
   * Records array for redo
   */
  redoStack: UseRefHistoryRecord<Serialized>[]

  /**
   * If undo is possible (non empty undoStack)
   */
  canUndo: boolean

  /**
   * If redo is possible (non empty redoStack)
   */
  canRedo: boolean

  /**
   * If change tracking is enabled (flipped by `pause()` / `resume()`)
   */
  isTracking: boolean

  /**
   * Tracked setter for the source state (value or updater form, like `setState`). Prefer it over
   * your own setter when the update should be visible to `commit()` in the same tick — see
   * `useStateManualHistory`.
   */
  setSource: Dispatch<SetStateAction<Raw>>

  /**
   * Create a new history record immediately, bypassing the throttle — cancels a pending trailing
   * commit for the same change
   */
  commit: () => void

  /**
   * Clear all the history and cancel a pending trailing commit
   */
  clear: () => void

  /**
   * Reset the source to the last history point without recording
   */
  reset: () => void

  /**
   * Pause change tracking
   */
  pause: () => void

  /**
   * Resume change tracking
   *
   * @param [commitNow] if true, a history record will be created after resuming
   */
  resume: (commitNow?: boolean) => void

  /**
   * A sugar for pausing the recording within a function scope: changes made with
   * `controls.setSource()` inside `fn` are not committed during `fn`, and a single commit is
   * created after it — unless `cancel()` is called.
   *
   * @param fn
   */
  batch: (fn: (cancel: () => void) => void) => void
}

export interface UseStateThrottledHistoryReturn<Raw, Serialized = Raw> extends UseStateThrottledHistoryControls<Raw, Serialized> {
  /**
   * An array of history records for undo, newest comes first
   */
  history: UseRefHistoryRecord<Serialized>[]
  /**
   * Undo the last change
   */
  undo: () => void
  /**
   * Redo the last change
   */
  redo: () => void
}

function fnBypass<Value, Result>(value: Value) {
  return value as unknown as Result
}

function cloneFnJSON<Value>(value: Value): Value {
  return JSON.parse(JSON.stringify(value))
}

function defaultDump<Raw, Serialized>(clone?: boolean | ((value: Raw) => Raw)) {
  return (clone
    ? typeof clone === 'function'
      ? clone
      : cloneFnJSON
    : fnBypass
  ) as unknown as (value: Raw) => Serialized
}

function defaultParse<Raw, Serialized>(clone?: boolean | ((value: Raw) => Raw)) {
  return (clone
    ? typeof clone === 'function'
      ? clone
      : cloneFnJSON
    : fnBypass
  ) as unknown as (value: Serialized) => Raw
}

/**
 * Map from @vueuse/core `useThrottledRefHistory`
 * (`source/vueuse/packages/core/useThrottledRefHistory/`).
 *
 * @example
 * const [count, setCount] = useState(0)
 * const { history, undo, redo, canUndo, canRedo } = useStateThrottledHistory([count, setCount], { throttle: 1000 })
 *
 * setCount(1) // first change after a quiet window commits immediately
 * setCount(2) // changes inside the window collapse into one trailing commit
 * undo() // count back to the previous record
 */
export function useStateThrottledHistory<Raw, Serialized = Raw>(
  state: State<Raw>,
  options: UseStateThrottledHistoryOptions<Raw, Serialized> = {},
): UseStateThrottledHistoryReturn<Raw, Serialized> {
  const [source, setSource] = useControllableState(state, { passive: true })
  const { capacity, clone = false, dump, parse, throttle = 200, trailing = true } = options

  // latest-value refs synced each render so every control below is a stable
  // callback that always reads the newest state and options
  const sourceRef = useRef(source)
  const setSourceRef = useRef(setSource)
  const dumpFn = dump ?? defaultDump<Raw, Serialized>(clone)
  const parseFn = parse ?? defaultParse<Raw, Serialized>(clone)
  const dumpRef = useRef(dumpFn)
  const parseRef = useRef(parseFn)
  const capacityRef = useRef(capacity)
  const throttleRef = useRef(throttle)
  const trailingRef = useRef(trailing)

  sourceRef.current = source
  setSourceRef.current = setSource
  dumpRef.current = dumpFn
  parseRef.current = parseFn
  capacityRef.current = capacity
  throttleRef.current = throttle
  trailingRef.current = trailing

  // snapshots live in refs; `setVersion` only triggers re-renders so chained
  // controls (setSource → commit → undo in one tick) stay exact.
  // `useRef` arguments are evaluated on every render and `dump` may be
  // user-provided (potentially impure) — initialize the first record once
  const lastRef = useRef<UseRefHistoryRecord<Serialized>>(undefined as unknown as UseRefHistoryRecord<Serialized>)
  if (!lastRef.current) {
    lastRef.current = {
      snapshot: dumpFn(source),
      timestamp: Date.now(),
    }
  }
  const undoStackRef = useRef<UseRefHistoryRecord<Serialized>[]>([])
  const redoStackRef = useRef<UseRefHistoryRecord<Serialized>[]>([])
  const [, setVersion] = useState(0)
  const bump = useCallback(() => setVersion(current => current + 1), [])

  // --- inlined upstream `throttleFilter` state (leading edge fixed to true)
  const lastExecRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const cancelPendingCommit = useCallback(() => {
    if (timerRef.current !== undefined) {
      clearTimeout(timerRef.current)
      timerRef.current = undefined
    }
  }, [])

  // --- tracking state (upstream: pausableFilter)
  const isTrackingRef = useRef(true)
  // value applied programmatically (undo / redo / reset / manual commit /
  // batch) — the next effect run carrying exactly this value is skipped
  // (upstream: `ignoreUpdates` + `ignorePrevAsyncUpdates`)
  const programmaticRef = useRef<{ value: Raw } | null>(null)
  const inBatchRef = useRef(false)

  const applySource = useCallback((value: Raw) => {
    sourceRef.current = value
    setSourceRef.current(value)
  }, [])

  // apply a value as part of a history operation (undo / redo / reset): the
  // change reaches the source but must not be recorded as a new commit
  const applyRestore = useCallback((value: Raw) => {
    programmaticRef.current = { value }
    applySource(value)
  }, [applySource])

  const setSourceTracked = useCallback<Dispatch<SetStateAction<Raw>>>((value) => {
    const next = typeof value === 'function'
      ? (value as (current: Raw) => Raw)(sourceRef.current)
      : value
    applySource(next)
    // changes made inside `batch()` are swallowed by the batch-end commit —
    // or, on cancel, left unrecorded until the next change (upstream:
    // `ignoreUpdates` around `fn`)
    if (inBatchRef.current)
      programmaticRef.current = { value: next }
  }, [applySource])

  const commit = useCallback(() => {
    // a manual commit resets the pending change so the effect carrying the
    // same value does not commit it twice (upstream: `ignorePrevAsyncUpdates`)
    cancelPendingCommit()
    programmaticRef.current = { value: sourceRef.current }

    undoStackRef.current = [lastRef.current, ...undoStackRef.current]

    const capacityValue = capacityRef.current
    if (capacityValue && undoStackRef.current.length > capacityValue)
      undoStackRef.current = undoStackRef.current.slice(0, capacityValue)

    redoStackRef.current = []
    lastRef.current = {
      snapshot: dumpRef.current(sourceRef.current),
      timestamp: Date.now(),
    }
    bump()
  }, [bump, cancelPendingCommit])

  const clear = useCallback(() => {
    cancelPendingCommit()
    undoStackRef.current = []
    redoStackRef.current = []
    bump()
  }, [bump, cancelPendingCommit])

  const undo = useCallback(() => {
    const [state, ...rest] = undoStackRef.current

    if (!state)
      return

    // the restore supersedes any pending trailing commit of a live change
    cancelPendingCommit()
    redoStackRef.current = [lastRef.current, ...redoStackRef.current]
    undoStackRef.current = rest
    applyRestore(parseRef.current(state.snapshot))
    lastRef.current = state
    bump()
  }, [applyRestore, bump, cancelPendingCommit])

  const redo = useCallback(() => {
    const [state, ...rest] = redoStackRef.current

    if (!state)
      return

    cancelPendingCommit()
    undoStackRef.current = [lastRef.current, ...undoStackRef.current]
    redoStackRef.current = rest
    applyRestore(parseRef.current(state.snapshot))
    lastRef.current = state
    bump()
  }, [applyRestore, bump, cancelPendingCommit])

  const reset = useCallback(() => {
    cancelPendingCommit()
    applyRestore(parseRef.current(lastRef.current.snapshot))
  }, [applyRestore, cancelPendingCommit])

  const pause = useCallback(() => {
    isTrackingRef.current = false
    bump()
  }, [bump])

  const resume = useCallback((commitNow?: boolean) => {
    isTrackingRef.current = true
    bump()
    if (commitNow)
      commit()
  }, [bump, commit])

  const batch = useCallback((fn: (cancel: () => void) => void) => {
    let canceled = false

    const cancel = () => {
      canceled = true
    }

    inBatchRef.current = true
    try {
      fn(cancel)
    }
    finally {
      inBatchRef.current = false
    }

    if (!canceled)
      commit()
  }, [commit])

  // upstream: `watchIgnorable(source, commit, { eventFilter: pausable(throttleFilter) })`
  // — the effect fires only for rendered state changes, never on mount (the
  // initial value is already the first history record)
  const prevSourceRef = useRef(source)
  useEffect(() => {
    // swallow the effect run caused by a programmatic application
    const programmatic = programmaticRef.current
    programmaticRef.current = null
    if (programmatic && Object.is(source, programmatic.value))
      return

    // unchanged value — nothing to record
    if (Object.is(source, prevSourceRef.current))
      return
    prevSourceRef.current = source

    // paused — upstream `pausableFilter` drops the invocation
    if (!isTrackingRef.current)
      return

    // --- inlined `throttleFilter`: leading edge commits immediately, changes
    // inside the window collapse into a single trailing commit
    const duration = throttleRef.current
    const elapsed = Date.now() - lastExecRef.current

    cancelPendingCommit()

    if (duration <= 0) {
      lastExecRef.current = Date.now()
      commit()
      return
    }

    if (elapsed > duration) {
      lastExecRef.current = Date.now()
      commit()
    }
    else if (trailingRef.current) {
      timerRef.current = setTimeout(() => {
        timerRef.current = undefined
        lastExecRef.current = Date.now()
        commit()
      }, Math.max(0, duration - elapsed))
    }
  }, [source, commit, cancelPendingCommit])

  // cancel a pending trailing commit when the component unmounts
  useEffect(() => cancelPendingCommit, [cancelPendingCommit])

  const history = [lastRef.current, ...undoStackRef.current]
  const controls: UseStateThrottledHistoryControls<Raw, Serialized> = {
    source,
    last: lastRef.current,
    undoStack: undoStackRef.current,
    redoStack: redoStackRef.current,
    canUndo: undoStackRef.current.length > 0,
    canRedo: redoStackRef.current.length > 0,
    isTracking: isTrackingRef.current,
    setSource: setSourceTracked,
    commit,
    clear,
    reset,
    pause,
    resume,
    batch,
  }

  return {
    history,
    undo,
    redo,
    ...controls,
  }
}
