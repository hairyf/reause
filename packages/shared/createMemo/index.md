---
category: Factory
---

# createMemo

Turn a pure function into a memoising hook.

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
