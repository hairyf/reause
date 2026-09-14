---
category: State
---

# useLastChanged

Records the timestamp of the last change

## Usage

```tsx
import { useLastChanged } from '@reause/shared'
import { useState } from 'react'

const [a, setA] = useState(0)
const lastChanged = useLastChanged(a)
// note: lastChanged is a plain number (or null), not a ref

setA(1)
// the change is not recorded synchronously — `lastChanged` becomes the
// timestamp on the render after the change, so a read right after `setA(1)`
// still sees `null`
```

Seed the returned value before any change is recorded with `initialValue`
(upstream: `initialValue`):

```tsx
const lastChanged = useLastChanged(input, { initialValue: Date.now() - 1000 * 60 * 5 })
```

## Type Declarations

```ts
export interface UseLastChangedOptions<
  InitialValue extends number | null | undefined = undefined,
> {
  /**
   * Value returned before any change has been recorded.
   *
   * (Upstream also extends Vue's `WatchOptions` — `immediate` / `deep` / `flush` / `once` have no
   * React equivalent here, see the mapping note.)
   *
   * @default null
   */
  initialValue?: InitialValue
}
export type UseLastChangedReturn = number | null
/**
 * Map from @vueuse/shared `useLastChanged`.
 *
 * @see https://vueuse.org/shared/useLastChanged
 */
export declare function useLastChanged<T>(
  value: T,
  options?: UseLastChangedOptions<undefined>,
): UseLastChangedReturn
export declare function useLastChanged<T>(
  value: T,
  options: UseLastChangedOptions<number>,
): number
```
