---
category: Utilities
---

# Shared Utils

Framework-agnostic helper functions ported 1:1 from VueUse's internal [`@vueuse/shared`](https://vueuse.org/shared/) utils group (`is.ts` / `general.ts`) — plain TypeScript with no React state, re-exported from the `@reause/shared` package entry.

## Usage

```ts
import { clamp, isClient, promiseTimeout, toArray } from '@reause/shared'

const limited = clamp(15, 0, 10) // 10

await promiseTimeout(100) // resolves after 100ms

toArray('hello') // ['hello']
toArray([1, 2, 3]) // [1, 2, 3]

if (isClient) {
  // browser-only code
}
```

## Type Declarations

```ts
export declare function promiseTimeout(
  ms: number,
  throwOnTimeout?: boolean,
  reason?: string,
): Promise<void>
export interface SingletonPromiseReturn<T> {
  (): Promise<T>
  /**
   * Reset current staled promise.
   * await it to have proper shutdown.
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
export declare function createSingletonPromise<T>(
  fn: () => Promise<T>,
): SingletonPromiseReturn<T>
/**
 * Increase string a value with unit
 *
 * @example '2px' + 1 = '3px'
 * @example '15em' + (-2) = '13em'
 */
export declare function increaseWithUnit(target: number, delta: number): number
export declare function increaseWithUnit(target: string, delta: number): string
export declare function increaseWithUnit(
  target: string | number,
  delta: number,
): string | number
/**
 * Get a px value for SSR use, do not rely on this method outside of SSR as REM
 * unit is assumed at 16px, which might not be the case on the client
 *
 * @example pxValue('37rem') // 592
 * @example pxValue('500px') // 500
 */
export declare function pxValue(px: string): number
/**
 * Create a new subset object by giving keys
 */
export declare function objectPick<O extends object, T extends keyof O>(
  obj: O,
  keys: T[],
  omitUndefined?: boolean,
): Pick<O, T>
/**
 * Create a new subset object by omit giving keys
 */
export declare function objectOmit<O extends object, T extends keyof O>(
  obj: O,
  keys: T[],
  omitUndefined?: boolean,
): Omit<O, T>
export declare function toArray<T>(value: T | readonly T[]): readonly T[]
export declare function toArray<T>(value: T | T[]): T[]
export declare const isClient: boolean
export declare const isDef: <T = any>(val?: T) => val is T
export declare const assert: (condition: boolean, ...infos: any[]) => void
export declare const isObject: (val: any) => val is object
export declare const now: () => number
export declare const timestamp: () => number
export declare const clamp: (n: number, min: number, max: number) => number
export declare const noop: () => void
export declare const rand: (min: number, max: number) => number
export declare const hasOwn: <T extends object, K extends keyof T>(
  val: T,
  key: K,
) => key is K
export declare const isIOS: boolean
export declare const hyphenate: (str: string) => string
/**
 * Values accepted by controllable state hooks: a plain value, a zero-argument
 * getter, a `[value, setter]` tuple or a `{ value, onChange }` pair. React
 * refs are deliberately **not** part of this union — a ref is a DOM handle,
 * so it is passed as a `RefObject` to DOM hooks and read with `unrefElement`
 * (`@reause/core`) instead of being treated as a state source.
 */
export type StateValue<T> =
  | T
  | (() => T)
  | readonly [T, (value: T | ((prev: T) => T)) => void]
  | {
      value: T
      onChange?: (value: T) => void
    }
/**
 * Allow a custom `window` instance, e.g. working with iframes or in testing
 * environments. Single source of truth — VueUse defines this in shared too.
 */
export interface ConfigurableWindow {
  window?: Window
}
/**
 * Type guard for React ref objects (`RefObject` — `{ current }` holders).
 * Callback refs are functions and cannot be read synchronously, so they are
 * not ref-like. Refs are DOM handles here, never state sources: use it to
 * detect a `RefObject` when a value may still be `undefined`/`null`.
 */
export declare function isRefLike(value: unknown): value is RefObject<unknown>
/**
 * Resolve a controllable-state source to its current value — the React
 * replacement for VueUse's `toValue`. A `[value, setter]` tuple resolves to
 * its first element, a `{ value, onChange }` pair to `.value`, a
 * zero-argument getter is invoked, and a plain value is returned as-is.
 *
 * React refs are not resolved here: a `RefObject` is a DOM handle, read with
 * `unrefElement` (`@reause/core`) instead.
 */
export declare function toValue<T>(value: StateValue<T>): T
export declare function toValue<T>(
  value: StateValue<T> | undefined | null,
): T | undefined | null
/**
 * Write a value back through a writable `State<T>` source — a
 * `[value, setter]` tuple or a `{ value, onChange }` pair. Plain values and
 * getters have no write path and are skipped. This is the write-side
 * counterpart of `toValue`; hooks that push values into a `State<T>` import it
 * from here rather than re-implementing the branches.
 */
export declare function writeState<T>(
  source: StateValue<T> | undefined | null,
  value: T,
): void
```
