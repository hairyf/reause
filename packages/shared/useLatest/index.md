---
category: State
---

# useLatest

Returns a ref whose `.current` always holds the latest rendered value.

## Usage

```tsx
import { useLatest } from '@reause/shared'

const latest = useLatest(value)
// the ref object itself is returned — not a `[ref]` tuple
// `latest.current` is always the value of the latest render
```

The ref object identity is stable for the lifetime of the component, so an
async callback captured on an earlier render (a `setTimeout`, a promise
continuation, a subscription handler) reads the **freshest** value when it
finally runs — no dependency array or re-subscription needed:

```tsx
const latest = useLatest(value)

// scheduled now, logs whatever `value` is when the timer fires
setTimeout(() => console.log(latest.current), 1000)
```
