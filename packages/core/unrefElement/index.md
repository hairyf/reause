---
category: Component
---

# unrefElement

Get the DOM element a React ref object currently holds

## Usage

```tsx
import { unrefElement } from '@reause/core'
import { useEffect, useRef } from 'react'

const div = useRef<HTMLDivElement>(null)

useEffect(() => {
  console.log(unrefElement(div)) // the <div> element (div.current)
})
```
