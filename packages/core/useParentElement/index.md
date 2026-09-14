---
category: Elements
---

# useParentElement

Get parent element of the given element

## Usage

```tsx
import { useParentElement } from '@reause/core'
import { useRef } from 'react'

const childRef = useRef<HTMLDivElement>(null)
const parent = useParentElement(childRef) // HTMLElement | SVGElement | null | undefined
```
