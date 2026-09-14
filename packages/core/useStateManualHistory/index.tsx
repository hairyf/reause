import type { State } from '@reause/shared'
import type { Dispatch, SetStateAction } from 'react'
import { useControllableState } from '@reause/shared'
import { useCallback, useRef, useState } from 'react'

export interface UseRefHistoryRecord<T> {
  snapshot: T
  timestamp: number
}

export interface UseStateManualHistoryOptions<Raw, Serialized = Raw> {
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
}

export interface UseStateManualHistoryControls<Raw, Serialized = Raw> {
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
   * Undo changes — restore the source to the previous history record
   */
  undo: () => void

  /**
   * Redo changes — restore the source to the next history record
   */
  redo: () => void

  /**
   * Clear all the history
   */
  clear: () => void

  /**
   * Reset the source to the last history point without recording
   */
  reset: () => void

  /**
   * Tracked setter for the source state (value or updater form, like `setState`). Prefer it over
   * your own setter when the update should be visible to `commit()` in the same tick — see the
   * hook's JSDoc.
   */
  setSource: Dispatch<SetStateAction<Raw>>
}

export interface UseStateManualHistoryReturn<Raw, Serialized = Raw> extends UseStateManualHistoryControls<Raw, Serialized> {
  /**
   * An array of history records for undo, newest comes first
   */
  history: UseRefHistoryRecord<Serialized>[]
  /**
   * Create a new history record immediately for the current value
   */
  commit: () => void
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
 * Map from @vueuse/core `useManualRefHistory`
 * (`source/vueuse/packages/core/useManualRefHistory/`). Manually track the
 * change history of a state when the user calls `commit()`, also provides undo and redo
 * functionality.
 *
 * The return object mirrors VueUse's `UseManualRefHistoryReturn` (refs flattened to plain values):
 * `const { history, commit, undo, redo... } = useStateManualHistory([source, setSource])`.
 *
 * 1. Source: upstream tracks a writable Vue `Ref<Raw>`; React state lives in the component, so the
 * source is the controlled tuple `[state, setState]` of an existing `useState` — upstream's
 * `setSource` option is superseded by the tuple's setter. 2. Same-tick commits: React `setState` is
 * asynchronous — a `commit()` right after your own `setState` call would snapshot the previous
 * rendered value. Use `controls.setSource()` for updates you commit in the same tick: it applies
 * the update synchronously (value or updater form) and forwards it to your `setSource`. 3. Storage:
 * snapshots live in refs and a version counter triggers re-renders. Records are plain objects and
 * timestamps use `Date.now()`.
 *
 * @example
 * const [count, setCount] = useState(0)
 * const { history, commit, undo, redo, canUndo, canRedo } = useStateManualHistory([count, setCount])
 *
 * setCount(count + 1)
 * commit() // record the new value
 * undo() // count back to the previous record
 */
export function useStateManualHistory<Raw, Serialized = Raw>(
  state: State<Raw>,
  options: UseStateManualHistoryOptions<Raw, Serialized> = {},
): UseStateManualHistoryReturn<Raw, Serialized> {
  const [source, setSource] = useControllableState(state, { passive: true })
  const { capacity, clone = false, dump, parse } = options

  // latest-value refs synced each render so every control below is a stable
  // callback that always reads the newest state and options
  const sourceRef = useRef(source)
  const setSourceRef = useRef(setSource)
  const dumpFn = dump ?? defaultDump<Raw, Serialized>(clone)
  const parseFn = parse ?? defaultParse<Raw, Serialized>(clone)
  const dumpRef = useRef(dumpFn)
  const parseRef = useRef(parseFn)
  const capacityRef = useRef(capacity)

  sourceRef.current = source
  setSourceRef.current = setSource
  dumpRef.current = dumpFn
  parseRef.current = parseFn
  capacityRef.current = capacity

  // snapshots live in refs; `setVersion` only triggers re-renders so chained
  // controls (setSource → commit → undo in one tick) stay exact
  const lastRef = useRef<UseRefHistoryRecord<Serialized>>({
    snapshot: dumpFn(source),
    timestamp: Date.now(),
  })
  const undoStackRef = useRef<UseRefHistoryRecord<Serialized>[]>([])
  const redoStackRef = useRef<UseRefHistoryRecord<Serialized>[]>([])
  const [, setVersion] = useState(0)
  const bump = useCallback(() => setVersion(current => current + 1), [])

  const applySource = useCallback((value: Raw) => {
    sourceRef.current = value
    setSourceRef.current(value)
  }, [])

  const setSourceTracked = useCallback<Dispatch<SetStateAction<Raw>>>((value) => {
    if (typeof value === 'function')
      applySource((value as (current: Raw) => Raw)(sourceRef.current))
    else
      applySource(value)
  }, [applySource])

  const commit = useCallback(() => {
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
  }, [bump])

  const clear = useCallback(() => {
    undoStackRef.current = []
    redoStackRef.current = []
    bump()
  }, [bump])

  const undo = useCallback(() => {
    const [state, ...rest] = undoStackRef.current

    if (!state)
      return

    redoStackRef.current = [lastRef.current, ...redoStackRef.current]
    undoStackRef.current = rest
    applySource(parseRef.current(state.snapshot))
    lastRef.current = state
    bump()
  }, [applySource, bump])

  const redo = useCallback(() => {
    const [state, ...rest] = redoStackRef.current

    if (!state)
      return

    undoStackRef.current = [lastRef.current, ...undoStackRef.current]
    redoStackRef.current = rest
    applySource(parseRef.current(state.snapshot))
    lastRef.current = state
    bump()
  }, [applySource, bump])

  const reset = useCallback(() => {
    applySource(parseRef.current(lastRef.current.snapshot))
  }, [applySource])

  const history = [lastRef.current, ...undoStackRef.current]
  const controls: UseStateManualHistoryControls<Raw, Serialized> = {
    source,
    last: lastRef.current,
    undoStack: undoStackRef.current,
    redoStack: redoStackRef.current,
    canUndo: undoStackRef.current.length > 0,
    canRedo: redoStackRef.current.length > 0,
    undo,
    redo,
    clear,
    reset,
    setSource: setSourceTracked,
  }

  return {
    history,
    commit,
    ...controls,
  }
}
