/* eslint-disable antfu/top-level-function */
// Ported from VueUse @vueuse/shared utils (source/vueuse/packages/shared/utils)
import type { RefObject } from 'react'

// ---------------------------------------------------------------------------
// general.ts
// ---------------------------------------------------------------------------

export function promiseTimeout(
  ms: number,
  throwOnTimeout = false,
  reason = 'Timeout',
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (throwOnTimeout)
      setTimeout(reject, ms, reason)
    else
      setTimeout(resolve, ms)
  })
}

export interface SingletonPromiseReturn<T> {
  (): Promise<T>
  /**
   * Reset current staled promise. await it to have proper shutdown.
   */
  reset: () => Promise<void>
}
/**
 * Create singleton promise function
 *
 * @example
 * ```
 * const promise = createSingletonPromise(async () => { ... })
 *
 * await promise()
 * await promise() // all of them will be bind to a single promise instance
 * await promise() // and be resolved together
 * ```
 */

export function createSingletonPromise<T>(fn: () => Promise<T>): SingletonPromiseReturn<T> {
  let _promise: Promise<T> | undefined

  function wrapper() {
    if (!_promise)
      _promise = fn()
    return _promise
  }
  wrapper.reset = async () => {
    const _prev = _promise
    _promise = undefined
    if (_prev)
      await _prev
  }

  return wrapper
}

/**
 * Increase string a value with unit
 *
 * @example '2px' + 1 = '3px'
 * @example '15em' + (-2) = '13em'
 */

export function increaseWithUnit(target: number, delta: number): number
export function increaseWithUnit(target: string, delta: number): string
export function increaseWithUnit(target: string | number, delta: number): string | number
export function increaseWithUnit(target: string | number, delta: number): string | number {
  if (typeof target === 'number')
    return target + delta
  const value = target.match(/^-?\d+\.?\d*/)?.[0] || ''
  const unit = target.slice(value.length)
  const result = (Number.parseFloat(value) + delta)
  if (Number.isNaN(result))
    return target
  return result + unit
}

/**
 * Get a px value for SSR use, do not rely on this method outside of SSR as REM unit is assumed at
 * 16px, which might not be the case on the client
 *
 * @example pxValue('37rem') // 592
 * @example pxValue('500px') // 500
 */

export function pxValue(px: string) {
  return px.endsWith('rem') ? Number.parseFloat(px) * 16 : Number.parseFloat(px)
}

/**
 * Create a new subset object by giving keys
 */

export function objectPick<O extends object, T extends keyof O>(obj: O, keys: T[], omitUndefined = false) {
  return keys.reduce((n, k) => {
    if (k in obj) {
      if (!omitUndefined || obj[k] !== undefined)
        n[k] = obj[k]
    }
    return n
  }, {} as Pick<O, T>)
}

/**
 * Create a new subset object by omit giving keys
 */

export function objectOmit<O extends object, T extends keyof O>(obj: O, keys: T[], omitUndefined = false) {
  return Object.fromEntries(Object.entries(obj).filter(([key, value]) => {
    return (!omitUndefined || value !== undefined) && !keys.includes(key as T)
  })) as Omit<O, T>
}

export function toArray<T>(value: T | readonly T[]): readonly T[]
export function toArray<T>(value: T | T[]): T[]
export function toArray<T>(value: T | T[]): T[] {
  return Array.isArray(value) ? value : [value]
}

// ---------------------------------------------------------------------------
// is.ts
// ---------------------------------------------------------------------------

export const isClient = typeof window !== 'undefined' && typeof document !== 'undefined'
export const isDef = <T = any>(val?: T): val is T => typeof val !== 'undefined'
export const assert = (condition: boolean, ...infos: any[]) => {
  if (!condition)
    console.warn(...infos)
}
const toString = Object.prototype.toString
export const isObject = (val: any): val is object =>
  toString.call(val) === '[object Object]'
export const now = () => Date.now()
export const timestamp = () => +Date.now()
export const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))
export const noop = () => {}
export const rand = (min: number, max: number) => {
  min = Math.ceil(min)
  max = Math.floor(max)
  return Math.floor(Math.random() * (max - min + 1)) + min
}
export const hasOwn = <T extends object, K extends keyof T>(val: T, key: K): key is K => Object.hasOwn(val, key)

export const isIOS = /* #__PURE__ */ getIsIOS()

function getIsIOS(): boolean {
  return isClient && !!window?.navigator?.userAgent && (
    (/iP(?:ad|hone|od)/.test(window.navigator.userAgent))
    // The new iPad Pro Gen3 does not identify itself as iPad, but as Macintosh.
    // https://github.com/vueuse/vueuse/issues/3577
    || (window?.navigator?.maxTouchPoints > 2 && /iPad|Macintosh/.test(window?.navigator.userAgent))
  )
}

// ---------------------------------------------------------------------------
// port.ts (hyphenate only — the remaining port.ts helpers stay unported)
// ---------------------------------------------------------------------------

// copied from vue: https://github.com/vuejs/core/blob/3be4e3cbe34b394096210897c1be8deeb6d748d8/packages/shared/src/general.ts#L90-L112
function cacheStringFunction<T extends (str: string) => string>(fn: T): T {
  const cache: Record<string, string> = Object.create(null)
  return ((str: string) => {
    const hit = cache[str]
    return hit || (cache[str] = fn(str))
  }) as T
}

const hyphenateRE = /\B([A-Z])/g
export const hyphenate = cacheStringFunction((str: string) => str.replace(hyphenateRE, '-$1').toLowerCase())

// ---------------------------------------------------------------------------
// reause 引用链核心工具 (single source of truth — other packages import
// these from @reause/shared, never re-implement; see MONITORING-HANDOFF §2C)
// ---------------------------------------------------------------------------

/**
 * Values accepted by controllable state hooks: a plain value, a zero-argument getter, a `[value,
 * setter]` tuple or a `{ value, onChange }` pair. React refs are deliberately **not** part of this
 * union — a ref is a DOM handle, so it is passed as a `RefObject` to DOM hooks and read with
 * `unrefElement` (`@reause/core`) instead of being treated as a state source.
 */
export type StateValue<T> = T | (() => T) | readonly [T, (value: T | ((prev: T) => T)) => void] | { value: T, onChange?: (value: T) => void }

/**
 * Allow a custom `window` instance, e.g. working with iframes or in testing environments. Single
 * source of truth — VueUse defines this in shared too.
 */
export interface ConfigurableWindow {
  window?: Window
}

/**
 * Type guard for React ref objects (`RefObject` — `{ current }` holders). Callback refs are
 * functions and cannot be read synchronously, so they are not ref-like. Refs are DOM handles here,
 * never state sources: use it to detect a `RefObject` when a value may still be `undefined`/`null`.
 */
export function isRefLike(value: unknown): value is RefObject<unknown> {
  return value !== null && value !== undefined && typeof value === 'object' && 'current' in value
}

/**
 * Resolve a controllable-state source to its current value — the React replacement for VueUse's
 * `toValue`. A `[value, setter]` tuple resolves to its first element, a `{ value, onChange }` pair
 * to `.value`, a zero-argument getter is invoked, and a plain value is returned as-is.
 *
 * React refs are not resolved here: a `RefObject` is a DOM handle, read with `unrefElement`
 * (`@reause/core`) instead.
 */
export function toValue<T>(value: StateValue<T>): T
export function toValue<T>(value: StateValue<T> | undefined | null): T | undefined | null
export function toValue<T>(value: StateValue<T> | undefined | null): T | undefined | null {
  if (Array.isArray(value) && value.length === 2 && typeof value[1] === 'function')
    return value[0]
  if (value !== null && value !== undefined && typeof value === 'object' && 'value' in value && !('addEventListener' in value))
    return value.value
  if (typeof value === 'function')
    return (value as () => T)()
  return value as T | undefined | null
}

/**
 * Write a value back through a writable `State<T>` source — a `[value, setter]` tuple or a `{
 * value, onChange }` pair. Plain values and getters have no write path and are skipped. This is the
 * write-side counterpart of `toValue`; hooks that push values into a `State<T>` import it from here
 * rather than re-implementing the branches.
 */
export function writeState<T>(source: StateValue<T> | undefined | null, value: T): void {
  if (source === null || source === undefined)
    return
  if (Array.isArray(source) && source.length === 2 && typeof source[1] === 'function') {
    (source as unknown as readonly [T, (next: T) => void])[1](value)
    return
  }
  if (typeof source === 'object' && !Array.isArray(source)
    && 'value' in source && !('addEventListener' in source)) {
    (source as { onChange?: (next: T) => void }).onChange?.(value)
  }
}
