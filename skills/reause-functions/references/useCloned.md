---
category: Utilities
---

# useCloned

Reactive clone of a value. By default, it use `JSON.parse(JSON.stringify())` to do the clone

## Usage

```tsx
import { useCloned } from '@reause/core'

const original = { key: 'value' }

const [cloned, setCloned, { isModified, sync }] = useCloned(original)

// on the next render `cloned` is the new state and `isModified` is true
setCloned({ key: 'some new value' })

console.log(cloned.key) // 'some new value' (next render)

sync() // re-clone from the source, isModified back to false
```

The return is a React tuple `[cloned, setCloned, { isModified, sync }]` — upstream returns an object
`{ cloned: Ref<T>, isModified, sync }`. `cloned` is a plain state value (not a writable ref), and
`setCloned` replaces it with the React immutable-update protocol: it never re-syncs from the source
(use `sync()` for that). Changes to the source are not reflected in the cloned controllable state
immediately.

## Source Forms

`source` is a React `State<T>` and every form is resolved through `toValue`. The snippets below show
the values on the render that follows the change:

```tsx
import { useCloned } from '@reause/core'

const [cloned] = useCloned(plainValue) // plain value
const [cloned] = useCloned(() => value) // getter
const [cloned] = useCloned(ref) // React ref (`{ current }`)
const [cloned] = useCloned([value, setValue]) // state tuple
const [cloned] = useCloned({ value, onChange: setValue }) // value/onChange pair
```

Every form except a plain value is treated as reactive, so `immediate: false` skips the initial sync
for them too. This is a deliberate difference from upstream `MaybeRefOrGetter<T>`
(`T | Ref<T> | (() => T)`): the `[value, setter]` tuple and `{ value, onChange }` pair are the React
state protocol and have no upstream equivalent.

## Return Values

- `cloned` — the current clone (plain state).
- `setCloned(next | prev => next)` — replaces the clone. This is the React-idiomatic way to edit it: it
  does not re-sync from the source, and it updates `isModified` by comparing the new value with the
  last synced source.
- `controls.isModified` — `true` while the clone differs from the last synced source.
- `controls.sync()` — re-clone from the source and reset `isModified` to `false`.

The `controls` object (`{ isModified, sync }`) keeps a stable identity while `isModified` and `sync`
are unchanged.

Mutating `cloned` in place is still detected on the next render as a legacy fallback, but prefer
`setCloned` — mutating state in place is not idiomatic React.

## Watch Options

`deep` and `immediate` control how the clone follows the source. Both default to `true`:
`immediate: true` syncs the clone on mount, and `deep: true` re-syncs on in-place mutations of the
source (set `deep: false` to only re-sync when the source reference is replaced).

```tsx
import { useCloned } from '@reause/core'

const original = { current: { key: 'value' } }

// no initial sync, and in-place mutations are ignored
const [cloned] = useCloned(original, { immediate: false, deep: false })

console.log(cloned) // {}

original.current.key = 'ignored' // deep: false — no re-sync

original.current = { key: 'replaced' } // new reference — re-syncs on the next render

console.log(cloned) // { key: 'replaced' }
```

## Manual cloning

```tsx
import { useCloned } from '@reause/core'

const original = { current: { key: 'value' } }

const [cloned, , { sync }] = useCloned(original, { manual: true })

original.current.key = 'manual'

console.log(cloned.key) // 'value'

sync()

console.log(cloned.key) // 'manual'
```

## Custom Clone Function

Using [`klona`](https://www.npmjs.com/package/klona) for example:

```tsx
import { useCloned } from '@reause/core'
import { klona } from 'klona'

const original = { key: 'value' }

const [cloned, , { isModified, sync }] = useCloned(original, { clone: klona })
```

## Type Declarations

```ts
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
export declare function cloneFnJSON<T>(source: T): T
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
export declare function useCloned<T>(
  source: State<T>,
  options?: UseClonedOptions<T>,
): UseClonedReturn<T>
```
