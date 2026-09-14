---
category: Watch
---

# useWhenever

Shorthand for watching value to be truthy

## Usage

```tsx
import { useWhenever } from '@reause/shared'

// this
useWhenever(ready, () => console.log(state))

// is equivalent to (the initial mount run is skipped — a plain `useEffect`
// would fire on mount, so add `{ immediate: true }` to fire then too):
useEffect(() => {
  if (ready)
    console.log(state)
}, [ready])
```

With `{ immediate: true }` the callback also fires on mount when the value is already truthy:

```tsx
import { useWhenever } from '@reause/shared'

// this
useWhenever(ready, () => console.log(state), { immediate: true })

// is equivalent to:
useEffect(() => {
  if (ready)
    console.log(state)
}, [ready])
```

### Callback Function

The callback will be called with `cb(value, oldValue)` — upstream's third
`onInvalidate` argument (upstream's effect invalidation registration) is not ported.

```tsx
import { useWhenever } from '@reause/shared'

useWhenever(height, (current, lastHeight) => {
  if (current > lastHeight)
    console.log(`Increasing height by ${current - lastHeight}`)
})
```

### Computed

Same as `watch`, you can pass a getter function to calculate on each change.

```tsx
import { useWhenever } from '@reause/shared'
import { useState } from 'react'

const [counter, setCounter] = useState(0)

// this
useWhenever(counter === 7, () => console.log('counter is 7 now!'))
```

### Options

Fire the callback on mount if the value is already truthy.

```tsx
import { useWhenever } from '@reause/shared'

useWhenever(ready, () => console.log(state), { immediate: true })
```

Only trigger once when the condition is met — the watch stops after the first truthy fire.

```tsx
import { useWhenever } from '@reause/shared'

useWhenever(ready, () => console.log(state), { once: true })
```

## Type Declarations

```ts
export type Truthy<T> = T extends false | null | undefined ? never : T
export interface UseWheneverOptions {
  /**
   * Fire the callback on mount if the value is already truthy
   *
   * @default false
   */
  immediate?: boolean
  /**
   * Only trigger once when the condition is met — the watch stops after the first truthy fire
   *
   * @default false
   */
  once?: boolean
}
/**
 * Map from @vueuse/shared `whenever`.
 *
 * @see https://vueuse.org/shared/whenever/
 *
 * @example
 * useWhenever(ready, () => console.log(state))
 * useWhenever(ready, () => console.log(state), { immediate: true })
 * useWhenever(ready, () => console.log(state), { once: true })
 */
export declare function useWhenever<T>(
  value: T,
  cb: (value: Truthy<T>, oldValue: T | undefined) => void,
  options?: UseWheneverOptions,
): () => void
```
