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
