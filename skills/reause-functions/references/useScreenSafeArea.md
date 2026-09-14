---
category: Browser
---

# useScreenSafeArea

Reactive `env(safe-area-inset-*)`

![image](https://webkit.org/wp-content/uploads/safe-areas-1.png)

## Usage

In order to make the page to be fully rendered in the screen, the additional attribute
`viewport-fit=cover` within `viewport` meta tag must be set firstly, the viewport meta tag may look
like this:

```html
<meta name="viewport" content="initial-scale=1, viewport-fit=cover" />
```

Then we could use `useScreenSafeArea` in the component as shown below:

```tsx
import { useScreenSafeArea } from '@reause/core'

const {
  top,
  right,
  bottom,
  left,
  update,
} = useScreenSafeArea()
```

For further details, you may refer to this documentation: [Designing Websites for iPhone X](https://webkit.org/blog/7929/designing-websites-for-iphone-x/)

## Type Declarations

```ts
export interface UseScreenSafeAreaReturn {
  top: string
  right: string
  bottom: string
  left: string
  update: () => void
}
/**
 * Map from @vueuse/core `useScreenSafeArea`
 * (`source/vueuse/packages/core/useScreenSafeArea/`).
 *
 * @example
 * const { top, right, bottom, left, update } = useScreenSafeArea()
 */
export declare function useScreenSafeArea(): UseScreenSafeAreaReturn
```
