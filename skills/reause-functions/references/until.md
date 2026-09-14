---
category: Watch
---

# until

Promised one-time watch for changes

## Usage

### Wait for some async data to be ready

```tsx
import { until } from '@reause/shared'

const isReady = { value: false }
// ... somewhere later: isReady.value = true
const ready = await until(() => isReady.value).toBe(true)
```

### Wait for custom conditions

```tsx
import { until } from '@reause/shared'

const count = { value: 0 }

void until(() => count.value).toMatch(v => v > 7).then(() => {
  alert('Count is now larger than 7!')
})
count.value = 8 // the next poll resolves
```

### Timeout

```tsx
import { until } from '@reause/shared'
// ---cut---
// will resolve once the source reads `true` or after 1000ms
await until(() => isReady.value).toBe(true, { timeout: 1000 })

// will throw if timeout
try {
  await until(() => isReady.value).toBe(true, { timeout: 1000, throwOnTimeout: true })
  // isReady.value === true
}
catch (e) {
  // timeout
}
```

### More Examples

```tsx
import { until } from '@reause/shared'
// ---cut---
await until(() => isReady.value).toBe(true)
await until(() => isReady.value).toBe(true, { timeout: 1000 })
await until(() => count.value).toMatch(v => v > 10 && v < 100)
await until(() => count.value).changed()
await until(() => count.value).changedTimes(10)
await until(() => count.value).toBeTruthy()
await until(() => count.value).toBeNull()

await until(() => count.value).not.toBeNull()
await until(() => count.value).not.toBeTruthy()
```

## Source

`until(source)` accepts a plain value or a zero-argument getter. The `value`
argument of `toBe(value)` / `toContains(value)` is a plain value.

> **Caveat** — `until` _polls the source it was given_. A plain value is a
> snapshot and never changes between polls, so use a getter when the value can
> change after `until` was called. A `Ref` / `{ current }` object is **not**
> accepted directly — pass `() => ref.current`. A source that is itself a
> function is treated as a getter and invoked.

## Type Declarations

```ts
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
  ) => Not extends true ? Promise<Exclude<T, U>> : Promise<U>) &
    ((
      condition: (v: T) => boolean,
      options?: UntilToMatchOptions,
    ) => Promise<T>)
  changed: (options?: UntilToMatchOptions) => Promise<T>
  changedTimes: (n?: number, options?: UntilToMatchOptions) => Promise<T>
}
type Falsy = false | void | null | undefined | 0 | 0n | ""
export interface UntilValueInstance<
  T,
  Not extends boolean = false,
> extends UntilBaseInstance<T, Not> {
  readonly not: UntilValueInstance<T, Not extends true ? false : true>
  toBe: <P = T>(
    value: P,
    options?: UntilToMatchOptions,
  ) => Not extends true ? Promise<T> : Promise<P>
  toBeTruthy: (
    options?: UntilToMatchOptions,
  ) => Not extends true ? Promise<T & Falsy> : Promise<Exclude<T, Falsy>>
  toBeNull: (
    options?: UntilToMatchOptions,
  ) => Not extends true ? Promise<Exclude<T, null>> : Promise<null>
  toBeUndefined: (
    options?: UntilToMatchOptions,
  ) => Not extends true ? Promise<Exclude<T, undefined>> : Promise<undefined>
  toBeNaN: (options?: UntilToMatchOptions) => Promise<T>
}
type ElementOf<T> = T extends readonly unknown[] ? T[number] : never
export interface UntilArrayInstance<T> extends UntilBaseInstance<T> {
  readonly not: UntilArrayInstance<T>
  toContains: (value: ElementOf<T>, options?: UntilToMatchOptions) => Promise<T>
}
/**
 * Map from @vueuse/shared `until`.
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
export declare function until<T extends unknown[]>(
  r: () => T,
): UntilArrayInstance<T>
export declare function until<T>(r: () => T): UntilValueInstance<T>
export declare function until<T extends unknown[]>(r: T): UntilArrayInstance<T>
export declare function until<T>(r: T): UntilValueInstance<T>
```
