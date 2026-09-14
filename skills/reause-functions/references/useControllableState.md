---
category: State
---

# useControllableState

A hook for combining controlled and uncontrolled state sources.

## Usage

```tsx
import { useControllableState } from '@reause/shared'
import { useState } from 'react'

// tuple state: `value` is the external value and `setValue` writes through to `setExternal`
const [external, setExternal] = useState('controlled')
const [value, setValue] = useControllableState([external, setExternal])

// passive plain-value state: initialized from the source, local updates persist
const [draft, setDraft] = useControllableState('draft', { passive: true })
```

Tuple `[value, setter]` and `{ value, onChange }` sources are always controlled: the current value is the resolved source and `setValue` writes through to the tuple setter / `onChange`.

`toValue` resolution is applied on every render, so lazy getters, refs, tuples, and value objects are supported consistently.

## Type Declarations

```ts
export type StateTuple<T> = [T, Dispatch<SetStateAction<T>>]
/** A value, lazy getter, state tuple, or value/onChange pair. */
export type State<T> = StateValue<T>
export interface UseControllableStateOptions<T> {
  defaultValue?: T | (() => T)
  shouldUpdate?: (prev: T, next: T) => boolean
  passive?: boolean
}
/**
 * Combine controlled and uncontrolled state sources.
 *
 */
export declare function useControllableState<T>(
  state: State<T>,
  options?: UseControllableStateOptions<T>,
): StateTuple<T>
```
