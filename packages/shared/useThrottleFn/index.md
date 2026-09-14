---
category: Utilities
---

# useThrottleFn

Throttle execution of a function

## Usage

```tsx
import { useThrottleFn } from '@reause/shared'
import { useEffect } from 'react'

const throttledFn = useThrottleFn(() => {
  // do something, it will be called at most 1 time per second
}, 1000)

useEffect(() => {
  window.addEventListener('resize', throttledFn)
  return () => window.removeEventListener('resize', throttledFn)
}, [throttledFn])
// note: returned fn is referentially stable so effects don't re-subscribe;
// ms is a plain number, re-read on
// every call
```

## Recommended Reading

- [**Debounce vs Throttle**: Definitive Visual Guide](https://kettanaito.com/blog/debounce-vs-throttle)
