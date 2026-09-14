import type { State } from '../useControllableState'
import { useEffect, useRef } from 'react'
import { toValue, writeState } from '../utils'

export type SyncStateDirection = 'both' | 'ltr' | 'rtl'

export interface SyncStateTransform<L, R> {
  ltr: (left: L) => R
  rtl: (right: R) => L
}

export interface SyncStateOptions<L, R, D extends SyncStateDirection = 'both'> {
  /**
   * Timing for syncing, same as watch's `flush` option.
   *
   * React note: no React equivalent — effects always run after commit, so `'sync'` / `'pre'` /
   * `'post'` are accepted for upstream signature compatibility and all behave identically.
   *
   * @default 'sync'
   */
  flush?: 'sync' | 'pre' | 'post'
  /**
   * Watch deeply.
   *
   * React note: no React equivalent — a `.current` write never schedules a re-render by itself, so
   * nested mutations cannot be observed (only the value as a whole is compared, via `Object.is`).
   * Accepted for upstream signature compatibility.
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
  /**
   * Direction of syncing.
   *
   * @default 'both'
   */
  direction?: D
  /**
   * Value convertors applied on the way to the other side: `ltr` maps a left value before it is
   * written into the right state, `rtl` maps a right value before it is written into the left
   * state. A missing convertor falls back to identity.
   */
  transform?: Partial<SyncStateTransform<L, R>>
}

// sentinel marking "no value observed yet" on a side — the first effect run
// performs the initial sync, mirroring upstream's default `immediate: true`
const neverObserved = Symbol('reause.syncState.neverObserved')

// write path of a `State` source: a `[value, setter]` tuple or a
// `{ value, onChange }` pair lands asynchronously through the setter or
// callback, while plain values / getters are read-only — mirrors
// `writeState`'s write-path detection so a read-only side is never recorded
// as written (a changing source must keep propagating)
function classifyWritable(source: unknown): 'async' | 'readonly' {
  if (source === null || source === undefined)
    return 'readonly'
  if (Array.isArray(source) && source.length === 2 && typeof source[1] === 'function')
    return 'async'
  if (typeof source === 'object' && !Array.isArray(source)
    && 'value' in source && !('addEventListener' in source)) {
    return 'async'
  }
  return 'readonly'
}

/**
 * Two-way state synchronization — keeps two writable `State<T>` sources in sync, with optional
 * direction and value transforms.
 *
 * Map from @vueuse/shared `syncRef`
 * (`source/vueuse/packages/shared/syncRef/`), renamed `syncState` for the
 * React port: the two sides are `State<T>` sources — a `[value, setter]` tuple, a `{ value,
 * onChange }` pair, a getter or a plain value — instead of Vue refs. Each side is read with
 * `toValue` and written back through its writable form (tuple setter / `onChange`); plain values
 * and getters have no write path, so that side is treated as read-only (the sync becomes one-way
 * for it).
 *
 * React Hook adaptation: upstream drives both sides through Vue's reactive `watchPausable`, pausing
 * all watchers while writing so a side never echoes its own write back. React has no reactive
 * system, so `syncState` is implemented as a hook (call it unconditionally at the top of a
 * component). A `useEffect` that runs after every commit compares each side's resolved value with
 * the last observed one via `Object.is` and mirrors the changed side into the other — through the
 * optional `transform` convertors when given — recording the value it just wrote as already
 * observed on the receiving side (the React analogue of upstream's pause/resume). Writes through a
 * setter / `onChange` are asynchronous, so until the target's value reflects the write the stale
 * pre-write value is absorbed and never mistaken for an external change. Read-only sides (plain
 * values / getters) are never marked as written, so a changing source keeps propagating. The
 * initial sync (upstream default `immediate: true`) runs in the mount effect and cascades ltr
 * before rtl. Because the observation happens post-commit, an external mutation is only adopted on
 * the render that follows it — the mutation itself never schedules a render, so a write made
 * outside of React is only observed once something else re-renders (see the maintainer notes on
 * reause #40 / #41). The returned `stop` function tears the synchronization down; the effect also
 * stops doing any work once the owning component unmounts.
 *
 * @example
 * const [a, setA] = useState('a')
 * const [b, setB] = useState('b')
 *
 * const stop = syncState([a, setA], [b, setB])
 *
 * console.log(a) // a
 *
 * setB('foo') // then the component re-renders
 * console.log(a) // foo
 *
 * setA('bar') // then the component re-renders
 * console.log(b) // bar
 *
 * stop()
 */
export function syncState<L, R, D extends SyncStateDirection = 'both'>(
  left: State<L>,
  right: State<R>,
  options: SyncStateOptions<L, R, D> = {},
): () => void {
  const { immediate = true, direction = 'both', transform = {} } = options

  // the states may be swapped between renders — the effect always observes
  // the latest instances through these mirrors
  const leftRef = useRef(left)
  leftRef.current = left
  const rightRef = useRef(right)
  rightRef.current = right

  const transformLTR = transform.ltr ?? ((v: L) => v as unknown as R)
  const transformRTL = transform.rtl ?? ((v: R) => v as unknown as L)

  const lastLeftRef = useRef<L | typeof neverObserved>(neverObserved)
  const lastRightRef = useRef<R | typeof neverObserved>(neverObserved)
  // pending-write absorption: a write landing through a setter / `onChange`
  // updates the target asynchronously — until the value reflects the write,
  // the still-old value must not be mistaken for an external change (nor echo
  // back to the other side)
  const pendingLeftRef = useRef<{ before: L, after: L } | null>(null)
  const pendingRightRef = useRef<{ before: R, after: R } | null>(null)
  const stoppedRef = useRef(false)

  useEffect(() => {
    if (stoppedRef.current)
      return

    const leftState = leftRef.current
    const rightState = rightRef.current
    const l = toValue(leftState)
    const r = toValue(rightState)
    const ltrActive = direction === 'both' || direction === 'ltr'
    const rtlActive = direction === 'both' || direction === 'rtl'

    if (lastLeftRef.current === neverObserved && lastRightRef.current === neverObserved) {
      // first observation — initial sync (upstream `immediate`), cascading ltr
      // before rtl so the rtl convertor sees the freshly written right value,
      // mirroring upstream's watcher creation order
      let lastLeft = l
      let lastRight = r
      if (immediate) {
        if (ltrActive) {
          const newRight = transformLTR(l)
          if (!Object.is(r, newRight)) {
            const rightKind = classifyWritable(rightState)
            if (rightKind !== 'readonly') {
              writeState(rightState, newRight)
              lastRight = newRight
              if (rightKind === 'async')
                pendingRightRef.current = { before: r, after: newRight }
            }
          }
          if (rtlActive) {
            const newLeft = transformRTL(newRight)
            if (!Object.is(l, newLeft)) {
              const leftKind = classifyWritable(leftState)
              if (leftKind !== 'readonly') {
                writeState(leftState, newLeft)
                lastLeft = newLeft
                if (leftKind === 'async')
                  pendingLeftRef.current = { before: l, after: newLeft }
              }
            }
          }
        }
        else {
          const newLeft = transformRTL(r)
          if (!Object.is(l, newLeft)) {
            const leftKind = classifyWritable(leftState)
            if (leftKind !== 'readonly') {
              writeState(leftState, newLeft)
              lastLeft = newLeft
              if (leftKind === 'async')
                pendingLeftRef.current = { before: l, after: newLeft }
            }
          }
        }
      }
      lastLeftRef.current = lastLeft
      lastRightRef.current = lastRight
      return
    }

    // a side still showing its pre-write value is our own in-flight write —
    // treat it as unchanged (absorption across asynchronous state updates)
    const leftPending = pendingLeftRef.current
    const rightPending = pendingRightRef.current
    const leftChanged = !Object.is(lastLeftRef.current, l) && !(leftPending && Object.is(leftPending.before, l))
    const rightChanged = !Object.is(lastRightRef.current, r) && !(rightPending && Object.is(rightPending.before, r))
    if (leftPending && !Object.is(leftPending.before, l))
      pendingLeftRef.current = null
    if (rightPending && !Object.is(rightPending.before, r))
      pendingRightRef.current = null

    // left → right
    if (ltrActive && leftChanged) {
      lastLeftRef.current = l
      const converted = transformLTR(l)
      if (!Object.is(r, converted)) {
        const rightKind = classifyWritable(rightState)
        if (rightKind !== 'readonly') {
          writeState(rightState, converted)
          lastRightRef.current = converted
          if (rightKind === 'async')
            pendingRightRef.current = { before: r, after: converted }
        }
      }
    }

    // right → left
    if (rtlActive && rightChanged) {
      lastRightRef.current = r
      const converted = transformRTL(r)
      if (!Object.is(l, converted)) {
        const leftKind = classifyWritable(leftState)
        if (leftKind !== 'readonly') {
          writeState(leftState, converted)
          lastLeftRef.current = converted
          if (leftKind === 'async')
            pendingLeftRef.current = { before: l, after: converted }
        }
      }
    }
  })

  return () => {
    stoppedRef.current = true
  }
}
