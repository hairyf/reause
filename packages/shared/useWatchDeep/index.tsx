import type { UseWatchCallback, UseWatchOptions } from '../useWatch'
import { useRef } from 'react'
import { useWatch } from '../useWatch'

/**
 * Structural equality, mirroring the semantics of test `toEqual`: primitives are compared with
 * `Object.is`, and `Date`, `RegExp`, `Array`, `Map`, `Set` and objects (plain or class instances)
 * are compared by contents. Functions compare by reference, and `Map` keys are matched by reference
 * because key lookups cannot deep-match, while `Map` values and `Set` items are compared deeply.
 *
 * Shared single source of truth — used by {@link useWatchDeep} and imported from `@reause/shared`
 * by core hooks that need deep change detection (e.g. `useCloned`).
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) {
    return true
  }
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') {
    return false
  }

  const aRecord = a as Record<string, unknown>
  const bRecord = b as Record<string, unknown>
  if (aRecord.constructor !== bRecord.constructor) {
    return false
  }

  if (a instanceof Date) {
    return a.getTime() === (b as Date).getTime()
  }
  if (a instanceof RegExp) {
    return a.source === (b as RegExp).source && a.flags === (b as RegExp).flags
  }
  if (Array.isArray(a)) {
    const bArray = b as unknown[]
    return a.length === bArray.length && a.every((item, index) => deepEqual(item, bArray[index]))
  }
  if (a instanceof Map) {
    const bMap = b as Map<unknown, unknown>
    if (a.size !== bMap.size) {
      return false
    }
    for (const [key, value] of a) {
      if (!bMap.has(key) || !deepEqual(value, bMap.get(key))) {
        return false
      }
    }
    return true
  }
  if (a instanceof Set) {
    const bSet = b as Set<unknown>
    if (a.size !== bSet.size) {
      return false
    }
    // Unordered deep item matching — pairs with deepClone, which clones Set
    // items, so a deep-cloned set deep-equals the original.
    const unmatched = [...bSet]
    for (const item of a) {
      const index = unmatched.findIndex(candidate => deepEqual(item, candidate))
      if (index === -1) {
        return false
      }
      unmatched.splice(index, 1)
    }
    return true
  }

  const aKeys = Object.keys(aRecord)
  if (aKeys.length !== Object.keys(bRecord).length) {
    return false
  }
  return aKeys.every(key => Object.hasOwn(bRecord, key) && deepEqual(aRecord[key], bRecord[key]))
}

/**
 * Deep clone pairing with {@link deepEqual}'s type coverage — `Date`, `RegExp`, `Array`, `Map`,
 * `Set` and objects (plain or class instances) are copied structurally, primitives and functions
 * pass through. Used to snapshot a live value into an isolated baseline for change detection (e.g.
 * `useCloned`'s source / cloned baselines, which must stay unaffected by in-place mutations).
 */
export function deepClone<T>(value: T): T {
  if (value === null || typeof value !== 'object')
    return value
  if (value instanceof Date)
    return new Date(value.getTime()) as T
  if (value instanceof RegExp)
    return new RegExp(value.source, value.flags) as T
  if (Array.isArray(value))
    return value.map(item => deepClone(item)) as T
  if (value instanceof Map) {
    const result = new Map()
    for (const [key, item] of value)
      result.set(key, deepClone(item))
    return result as T
  }
  if (value instanceof Set) {
    const result = new Set()
    for (const item of value)
      result.add(deepClone(item))
    return result as T
  }
  // Preserve the prototype so class instances clone back into their class
  // (pairs with deepEqual, which compares by constructor); plain objects keep
  // the Object prototype.
  const result: Record<string, unknown> = Object.create(Object.getPrototypeOf(value) as object) as Record<string, unknown>
  for (const key of Object.keys(value))
    result[key] = deepClone((value as Record<string, unknown>)[key])
  return result as T
}

/**
 * Map from @vueuse/shared `watchDeep`.
 *
 * @example
 * ```ts
 * const [obj, setObj] = useState({ foo: { bar: { deep: 5 } } })
 * useWatchDeep(obj, (value, oldValue) => console.log(value, oldValue))
 * setObj({ foo: { bar: { deep: 10 } } }) // fires — nested value changed
 * setObj({ foo: { bar: { deep: 10 } } }) // silent — deep-equal reassignment
 * ```
 */
export function useWatchDeep<T extends any[]>(source: readonly [...T], callback: UseWatchCallback<[...T]>, options?: UseWatchOptions): void
export function useWatchDeep<T>(source: T, callback: UseWatchCallback<T>, options?: UseWatchOptions): void
export function useWatchDeep(source: any, callback: UseWatchCallback, options: UseWatchOptions = {}) {
  // When `immediate` is set, useWatch's first callback invocation is the mount
  // call `(value, undefined)` and must always be forwarded; every subsequent
  // invocation is filtered through the deep comparison.
  const immediateCall = useRef(options.immediate === true)

  useWatch(source, (value, oldValue) => {
    if (immediateCall.current) {
      immediateCall.current = false
      callback(value, oldValue)
      return
    }

    if (!deepEqual(value, oldValue))
      callback(value, oldValue)
  }, options)
}
