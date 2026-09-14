import { promiseTimeout } from '../utils'

/**
 * Polling interval (ms) used to resolve `until` promises. React has no reactive watch, so the port
 * re-reads the source at this fixed interval — the same polling approach `useFetch` uses for its
 * `refetch` watch.
 */
const UNTIL_POLL_INTERVAL = 50

/**
 * Minimal structural equality — `Object.is` for primitives (so `NaN` equals `NaN`), arrays compared
 * by length and element, plain objects by own-key count and value. Used by `changedTimes` when
 * `deep: true`.
 */
function deepEquals(a: unknown, b: unknown): boolean {
  if (Object.is(a, b))
    return true
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null)
    return false
  const aIsArray = Array.isArray(a)
  const bIsArray = Array.isArray(b)
  if (aIsArray !== bIsArray)
    return false
  if (aIsArray && bIsArray) {
    const arrA = a as unknown[]
    const arrB = b as unknown[]
    if (arrA.length !== arrB.length)
      return false
    return arrA.every((item, index) => deepEquals(item, arrB[index]))
  }
  const keysA = Object.keys(a as object)
  const keysB = Object.keys(b as object)
  if (keysA.length !== keysB.length)
    return false
  return keysA.every(key => deepEquals((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]))
}

/**
 * Clone used to snapshot the source between polls when `changedTimes` runs with `deep: true` — the
 * poller re-reads the same reference, so a reference copy could never see an in-place mutation.
 */
function cloneDeep<T>(value: T): T {
  if (value === null || typeof value !== 'object')
    return value
  if (Array.isArray(value))
    return (value as unknown[]).map(item => cloneDeep(item)) as T
  const result: Record<string, unknown> = {}
  for (const key of Object.keys(value as object))
    result[key] = cloneDeep((value as Record<string, unknown>)[key])
  return result as T
}

export interface UntilToMatchOptions {
  /**
   * Milliseconds timeout for promise to resolve/reject if the when condition does not meet. 0 for
   * never timed out
   *
   * @default 0
   */
  timeout?: number

  /**
   * Reject the promise when timeout
   *
   * @default false
   */
  throwOnTimeout?: boolean

  /**
   * `deep` option for the internal watch — kept for API compatibility. The React poller re-reads
   * the source on every tick, so deep observation is implicit and this option is effectively a
   * no-op.
   *
   * @default false
   */
  deep?: boolean
}

export interface UntilBaseInstance<T, Not extends boolean = false> {
  toMatch: (<U extends T = T>(
    condition: (v: T) => v is U,
    options?: UntilToMatchOptions,
  ) => Not extends true ? Promise<Exclude<T, U>> : Promise<U>) & ((
    condition: (v: T) => boolean,
    options?: UntilToMatchOptions,
  ) => Promise<T>)
  changed: (options?: UntilToMatchOptions) => Promise<T>
  changedTimes: (n?: number, options?: UntilToMatchOptions) => Promise<T>
}

type Falsy = false | void | null | undefined | 0 | 0n | ''

export interface UntilValueInstance<T, Not extends boolean = false> extends UntilBaseInstance<T, Not> {
  readonly not: UntilValueInstance<T, Not extends true ? false : true>

  toBe: <P = T>(value: P, options?: UntilToMatchOptions) => Not extends true ? Promise<T> : Promise<P>
  toBeTruthy: (options?: UntilToMatchOptions) => Not extends true ? Promise<T & Falsy> : Promise<Exclude<T, Falsy>>
  toBeNull: (options?: UntilToMatchOptions) => Not extends true ? Promise<Exclude<T, null>> : Promise<null>
  toBeUndefined: (options?: UntilToMatchOptions) => Not extends true ? Promise<Exclude<T, undefined>> : Promise<undefined>
  toBeNaN: (options?: UntilToMatchOptions) => Promise<T>
}

type ElementOf<T> = T extends readonly unknown[] ? T[number] : never

export interface UntilArrayInstance<T> extends UntilBaseInstance<T> {
  readonly not: UntilArrayInstance<T>

  toContains: (value: ElementOf<T>, options?: UntilToMatchOptions) => Promise<T>
}

/**
 * Resolve the accepted `until` source — a plain value or a zero-argument getter (the
 * React-idiomatic live source; a `Ref` / `{ current }` object is not accepted — pass `() =>
 * ref.current`).
 *
 * NOTE: a source value that *is* a function is treated as a getter and invoked (the same ambiguity
 * `toValue` has).
 */
function resolveSource<T>(source: T | (() => T)): T {
  return typeof source === 'function' ? (source as () => T)() : source
}

function createUntil<T>(r: any, isNot = false): UntilValueInstance<T, boolean> | UntilArrayInstance<T> {
  function toMatch(
    condition: (v: any) => boolean,
    { timeout, throwOnTimeout }: UntilToMatchOptions = {},
  ): Promise<T> {
    let stop: (() => void) | null = null

    const watcher = new Promise<T>((resolve) => {
      let settled = false

      const check = () => {
        if (settled)
          return
        const value = resolveSource(r)
        if (condition(value) !== isNot) {
          settled = true
          stop?.()
          resolve(value)
        }
      }

      // mirror upstream watch's `immediate: true` + `flush: 'sync'` initial check
      check()
      if (!settled) {
        const timer = setInterval(check, UNTIL_POLL_INTERVAL)
        stop = () => clearInterval(timer)
      }
    })

    const promises: Promise<T>[] = [watcher]
    if (timeout != null) {
      promises.push(
        promiseTimeout(timeout, throwOnTimeout)
          .then(() => resolveSource(r))
          .finally(() => stop?.()),
      )
    }

    return Promise.race(promises)
  }

  function toBe<P>(value: P, options?: UntilToMatchOptions) {
    return toMatch(v => v === value, options)
  }

  function toBeTruthy(options?: UntilToMatchOptions) {
    return toMatch(v => Boolean(v), options)
  }

  function toBeNull(options?: UntilToMatchOptions) {
    return toBe<null>(null, options)
  }

  function toBeUndefined(options?: UntilToMatchOptions) {
    return toBe<undefined>(undefined, options)
  }

  function toBeNaN(options?: UntilToMatchOptions) {
    return toMatch(Number.isNaN, options)
  }

  function toContains(
    value: any,
    options?: UntilToMatchOptions,
  ) {
    return toMatch((v) => {
      const array = Array.from(v as any)
      return array.includes(value)
    }, options)
  }

  function changed(options?: UntilToMatchOptions) {
    return changedTimes(1, options)
  }

  function changedTimes(n = 1, options?: UntilToMatchOptions) {
    // count actual changes, not ticks: the poller may re-read an unchanged
    // source several times before the next mutation. Change detection is
    // `Object.is`-aware, so an unchanged `NaN` source never counts; with
    // `deep: true` the last observed value is deep-cloned, so nested
    // mutations of a same-referent array/object are detected structurally
    // (the poller cannot rely on reference replacement the way a Vue watch
    // does).
    let count = 0
    let hasBaseline = false
    let lastValue: any

    const deep = options?.deep ?? false
    const snapshot = (value: any) => (deep ? cloneDeep(value) : value)

    return toMatch((v) => {
      if (!hasBaseline) {
        hasBaseline = true
        lastValue = snapshot(v)
        return count >= n
      }
      const changed = deep ? !deepEquals(lastValue, v) : !Object.is(lastValue, v)
      if (changed) {
        count += 1
        lastValue = snapshot(v)
      }
      return count >= n
    }, options)
  }

  if (Array.isArray(resolveSource(r))) {
    const instance: UntilArrayInstance<T> = {
      toMatch: toMatch as any,
      toContains,
      changed,
      changedTimes,
      get not() {
        return createUntil(r, !isNot) as UntilArrayInstance<T>
      },
    }
    return instance
  }
  else {
    const instance: UntilValueInstance<T, boolean> = {
      toMatch: toMatch as any,
      toBe,
      toBeTruthy: toBeTruthy as any,
      toBeNull: toBeNull as any,
      toBeNaN,
      toBeUndefined: toBeUndefined as any,
      changed,
      changedTimes,
      get not() {
        return createUntil(r, !isNot) as UntilValueInstance<T, boolean>
      },
    }

    return instance
  }
}

/**
 * Promised one-time watch for changes
 *
 * Map from @vueuse/shared `until`
 * React adaptation: upstream resolves when Vue's reactive `watch` callback first observes the
 * condition holding; React has no reactive refs or watch, so this port **polls** the source — a
 * plain value or a zero-argument getter — at a small fixed interval (the same polling `useFetch`
 * uses for its `refetch` watch) and resolves the promise the first time the condition holds.
 * `until` is a **pure function, not a hook** — no React hooks are involved — so it can be used
 * anywhere a plain promise utility can.
 *
 * A plain value is a snapshot: it never changes between polls, so use a getter when the value may
 * change after `until` was called (`until(() => ref.current)`). A `Ref` / `{ current }` object is
 * not accepted directly. The `value` passed to `toBe` / `toContains` is a plain value too.
 *
 * @example
 * let count = 0
 * void until(() => count).toMatch(v => v > 7).then(() => {
 *   alert('Counter is now larger than 7!')
 * })
 * count = 8 // the next poll resolves
 *
 * @see https://vueuse.org/shared/until/
 */
export function until<T extends unknown[]>(r: () => T): UntilArrayInstance<T>
export function until<T>(r: () => T): UntilValueInstance<T>
export function until<T extends unknown[]>(r: T): UntilArrayInstance<T>
export function until<T>(r: T): UntilValueInstance<T>
export function until<T>(r: any): UntilValueInstance<T, boolean> | UntilArrayInstance<T> {
  return createUntil(r)
}
