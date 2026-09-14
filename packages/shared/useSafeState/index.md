---
category: State
---

# useSafeState

A `useState` whose setter is a no-op once the component has unmounted.

## Usage

```tsx
import { useSafeState } from '@reause/shared'

const [value, setValue] = useSafeState(0)

async function load() {
  const data = await fetchData()
  // ignored if the component unmounted while the request was in flight
  setValue(data)
}
```
