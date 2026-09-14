---
category: Browser
---

# useFavicon

Reactive favicon

## Usage

```tsx
import { useFavicon } from '@reause/core'

const [icon, setIcon] = useFavicon()

setIcon('dark.png') // change current icon
```

### Passing a source ref

`newIcon` is a read-only value source and takes a plain `string | null | undefined` (upstream:
`MaybeRef<string | null | undefined>`). Resolve a React ref at the call site; the returned setter
owns the state from mount on, so a new argument is not adopted afterwards:

```tsx
const [icon, setIcon] = useFavicon('dark.png')

setIcon('light.png') // change the favicon
const [refIcon] = useFavicon(iconRef.current) // resolve a React ref at the call site
```

## Type Declarations

```ts
export interface UseFaviconOptions {
  /**
   * The base URL to prepend to the favicon path.
   *
   * @default ''
   */
  baseUrl?: string
  /**
   * Specify a custom `document` instance, e.g. working with iframes or in testing environments.
   */
  document?: Document | null
  /**
   * The `<link>` `rel` attribute to manage.
   *
   * @default 'icon'
   */
  rel?: string
}
export type UseFaviconReturn = [
  icon: string | null | undefined,
  setIcon: Dispatch<SetStateAction<string | null | undefined>>,
]
/**
 * Map from @vueuse/core `useFavicon`
 * (`source/vueuse/packages/core/useFavicon/`).
 *
 * @example
 * const [icon, setIcon] = useFavicon('dark.png')
 * console.log(icon) // print current icon
 * setIcon('light.png') // change current icon
 */
export declare function useFavicon(
  newIcon?: string | null | undefined,
  options?: UseFaviconOptions,
): UseFaviconReturn
```
