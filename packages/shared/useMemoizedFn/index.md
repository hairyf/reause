---
category: Side-effects
---

# useMemoizedFn

Keep a function's identity stable while always calling its latest implementation.

## Usage

```tsx
import { useMemoizedFn } from '@reause/shared'

const [count, setCount] = useState(0)

// no deps array: the identity never changes, the body always reads `count`
const show = useMemoizedFn(() => console.log(count))
```

Passing `show` to a memoised child keeps that child from re-rendering when `count` changes — the reason to reach for it over `useCallback`, whose identity follows its deps.

`useLatest` covers adjacent ground differently: it tracks a value and hands back a ref, while this hook hands back a stable callable. react-use's `useEvent` is the closest upstream equivalent of that callable form.
