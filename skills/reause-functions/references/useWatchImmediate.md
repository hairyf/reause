---
category: Watch
---

# useWatchImmediate

Shorthand for watching value with `{ immediate: true }`

## Usage

Similar to `useWatch`, but the callback also fires once on mount with the
current value.

```tsx
import { useWatchImmediate } from '@reause/shared'
import { useState } from 'react'

const [obj, setObj] = useState('vue-use')

// logs 'vue-use' on mount, then the new value on every change
useWatchImmediate(obj, (updated) => {
  console.log(updated)
})

// later, from an event handler:
setObj('VueUse') // logs 'VueUse'
```

## Type Declarations

```ts
/**
 * Map from @vueuse/shared `watchImmediate`.
 *
 * @example
 * ```ts
 * // logs on mount ('vue-use') and again on every change ('VueUse', ...)
 * useWatchImmediate(obj, updated => console.log(updated))
 * useWatchImmediate([count, name], (value, oldValue) => console.log(value, oldValue))
 * ```
 */
export declare function useWatchImmediate<T extends any[]>(
  source: readonly [...T],
  callback: UseWatchCallback<[...T]>,
): void
export declare function useWatchImmediate<T>(
  source: T,
  callback: UseWatchCallback<T>,
): void
```
