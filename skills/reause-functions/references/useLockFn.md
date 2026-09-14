---
category: Side-effects
---

# useLockFn

Add a lock to an async function so overlapping calls are dropped rather than run in parallel — React port of ahooks' `useLockFn`.

## Usage

```tsx
import { useLockFn } from '@reause/shared'

const submit = useLockFn(async (id: string) => {
  await api.submit(id)
})

submit('a') // runs
submit('b') // dropped — resolves to `undefined`, does not reject
```

## Type Declarations

```ts
/**
 * Map from ahooks `useLockFn`.
 *
 * @param fn The async function to lock. Called with the wrapper's arguments and
 * awaited; its rejection is rethrown to the caller of the wrapper. Its identity
 * is the wrapper's only `useCallback` dependency.
 * @returns A locked wrapper: `(...args: P) => Promise<V | undefined>`, where a
 * resolved `undefined` means the call was dropped because another was still in
 * flight.
 *
 * @example
 * const submit = useLockFn(async () => {
 *   await api.submit()
 * })
 *
 * // rapid double-click: the first call runs, the second resolves to undefined
 * submit()
 * submit() // Promise<undefined> — dropped, not queued
 */
export declare function useLockFn<P extends any[] = any[], V = any>(
  fn: (...args: P) => Promise<V>,
): (...args: P) => Promise<V | undefined>
```
