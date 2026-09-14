---
category: Animation
---

# useUpdate

A force-update hook — React port of react-use's [`useUpdate`](https://streamich.github.io/react-use/?path=/story/animation-useupdate--docs).

## Usage

```tsx
import { useUpdate } from '@reause/shared'

const update = useUpdate()

update() // forces a re-render
```

## Type Declarations

```ts
/**
 * Map from react-use `useUpdate`.
 *
 * @example
 * const update = useUpdate()
 * update() // forces a re-render
 */
export declare function useUpdate(): () => void
```
