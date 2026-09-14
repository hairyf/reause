---
category: Factory
---

# createMemo

Turn a pure function into a memoising hook — React port of react-use's `createMemo`.

## Usage

```tsx
import { createMemo } from '@reause/shared'

// called once, at module scope: the returned function is a hook
const useFullName = createMemo((first: string, last: string) => `${first} ${last}`)

function Profile({ first, last }: { first: string, last: string }) {
  const fullName = useFullName(first, last)
  return <span>{fullName}</span>
}
```

The dependencies are the raw `args`, compared by reference. The memoised body
re-runs whenever an argument is a new reference, even if it is structurally
equal, so pass already-stable arguments — a fresh object, array or callback on
every render turns `createMemo` into an unmemoised call.

Ported from react-use's `source/react-use/src/factory/createMemo.ts` and
`source/react-use/docs/createMemo.md` (upstream exports it as the default; reause
exports it by name).

Different from `useMemoize`: that one keeps a persistent cache keyed by the
arguments and shares it across calls and components, while `createMemo` is a
render-scoped `useMemo` wrapper that caches nothing after the consumer unmounts.

## Type Declarations

```ts
/**
 * Map from react-use `createMemo`.
 *
 * @see https://github.com/streamich/react-use/blob/master/src/factory/createMemo.ts
 * @see https://github.com/streamich/react-use/blob/master/docs/createMemo.md
 */
export declare function createMemo<T extends (...args: any) => any>(
  fn: T,
): (...args: Parameters<T>) => ReturnType<T>
```
