---
category: Lifecycle
---

# useUpdateEffect

`useEffect` that skips the first render — React port of react-use's [`useUpdateEffect`](https://streamich.github.io/react-use/?path=/story/lifecycle-useupdateeffect--docs), whose upstream implementation lives in `source/react-use/src/useUpdateEffect.ts` and is built on `source/react-use/src/useFirstMountState.ts` (inlined privately by this port).

## Usage

```tsx
import { useUpdateEffect } from '@reause/shared'

useUpdateEffect(() => {
  console.log('count changed, but not on mount')
}, [count])
```
