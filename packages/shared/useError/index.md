---
category: Side-effects
---

# useError

Returns a stable error dispatcher that re-throws on the next render.

## Usage

```tsx
import { useError } from '@reause/shared'

function ThrowButton() {
  const dispatchError = useError()

  // dispatch from an event handler / async callback: `dispatchError` never
  // throws itself, the error surfaces on the following render
  return <button onClick={() => dispatchError(new Error('boom'))}>throw</button>
}

// wrap the tree in an Error Boundary so the re-thrown error is caught
```
