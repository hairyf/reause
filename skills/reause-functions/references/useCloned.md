---
category: Utilities
---

# useCloned

Reactive clone of a value. By default, it use `JSON.parse(JSON.stringify())` to do the clone

## Usage

```tsx
import { useCloned } from '@reause/core'

const [original, setOriginal] = useState({ key: 'value' })

const [cloned, setCloned, { isModified, sync }] = useCloned({
  value: original,
  onChange: setOriginal,
})

// on the next render `cloned` is the new state and `isModified` is true
setCloned({ key: 'some new value' })

console.log(cloned.key) // 'some new value' (next render)

sync() // re-clone from the source, isModified back to false
```

## Manual cloning

```tsx
import { useCloned } from '@reause/core'

const [original, setOriginal] = useState({ key: 'value' })

const [cloned, , { sync }] = useCloned(
  { value: original, onChange: setOriginal },
  { manual: true }
)

setOriginal({ key: 'manual' })

console.log(cloned.key) // 'value'

sync()

console.log(cloned.key) // 'manual'
```

## Custom Clone Function

Using [`klona`](https://www.npmjs.com/package/klona) for example:

```tsx
import { useCloned } from '@reause/core'
import { klona } from 'klona'

const [original, setOriginal] = useState({ key: 'value' })

const [cloned, , { isModified, sync }] = useCloned(
  { value: original, onChange: setOriginal },
  { clone: klona }
)
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
