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

## Type Declarations

```ts
type ElementSource = HTMLElement | SVGElement | null | undefined
/**
 * Map from @vueuse/core `useParentElement`
 * (`source/vueuse/packages/core/useParentElement/`).
 *
 * @example
 * const childRef = useRef<HTMLDivElement>(null)
 * const parent = useParentElement(childRef)
 */
export declare function useParentElement(
  element?: RefObject<ElementSource>,
): ElementSource
```
