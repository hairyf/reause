---
category: Browser
---

# useBrowserLocation

Reactive browser location

## Usage

```tsx
import { useBrowserLocation } from '@reause/core'

const location = useBrowserLocation()

// read the current URL parts
const { href, pathname, search, hash } = location
console.log(href) // 'https://example.com/path?q=1#anchor'

// navigate by assigning a writable field
location.hash = '#top'
```

> NOTE: If you're using React Router, use the location utilities provided by
> the router instead.

## Type Declarations

```ts
export interface UseBrowserLocationOptions extends ConfigurableWindow {}
export interface BrowserLocationState {
  readonly trigger: string
  readonly state?: any
  readonly length?: number
  readonly origin?: string
  hash?: string
  host?: string
  hostname?: string
  href?: string
  pathname?: string
  port?: string
  protocol?: string
  search?: string
}
/**
 * Map from @vueuse/core `useBrowserLocation`
 * (`source/vueuse/packages/core/useBrowserLocation/`).
 *
 * @example
 * const location = useBrowserLocation()
 *
 * location.hash = '#top' // navigate: URL hash becomes `#top`
 * console.log(location.href)
 */
export declare function useBrowserLocation(
  options?: UseBrowserLocationOptions,
): BrowserLocationState
```
