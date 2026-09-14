---
category: Lifecycle
---

# useIsomorphicLayoutEffect

`useLayoutEffect` on the client, `useEffect` on the server

## Usage

```tsx
import { useIsomorphicLayoutEffect } from '@reause/shared'
import { useRef } from 'react'

const boxRef = useRef<HTMLDivElement>(null)

useIsomorphicLayoutEffect(() => {
  // on the client this runs after the DOM is committed and before the browser
  // paints — a real measurement, in the same frame
  setWidth(boxRef.current?.getBoundingClientRect().width ?? 0)
}, [])
```

## Type Declarations

```ts
/**
 * Map from react-use `useIsomorphicLayoutEffect`
 * (`source/react-use/src/useIsomorphicLayoutEffect.ts`).
 *
 * @example
 * useIsomorphicLayoutEffect(() => {
 *   // before the browser paints on the client, on the server's passive effect
 *   // timing there
 *   setHeight(boxRef.current?.getBoundingClientRect().height ?? 0)
 * }, [])
 */
export declare const useIsomorphicLayoutEffect: typeof useEffect
```
