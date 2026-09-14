---
category: Utilities
---

# usePrevious

Holds the previous value of a source

## Usage

```tsx
import { usePrevious } from '@reause/core'

const previous = usePrevious(counter) // `undefined` until the first change
// after each change, `previous` is the value the source had before it
```

## Type Declarations

```ts
/**
 * Map from @vueuse/core `usePrevious`
 * (`source/vueuse/packages/core/usePrevious/`).
 *
 * @example
 * const previous = usePrevious(counter) // `undefined` until the first change
 * const previous = usePrevious(counter, 0) // `0` until the first change
 *
 * @see   {@link https://vueuse.org/core/usePrevious}
 */
export declare function usePrevious<T>(value: T): T | undefined
export declare function usePrevious<T>(value: T, initialValue: T): T
```
