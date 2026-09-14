---
category: Browser
---

# useMediaQuery

Reactive [Media Query](https://developer.mozilla.org/en-US/docs/Web/CSS/Media_Queries/Testing_media_queries)

## Usage

```tsx
import { useMediaQuery } from '@reause/core'

const isLargeScreen = useMediaQuery('(min-width: 1024px)')
const isPreferredDark = useMediaQuery('(prefers-color-scheme: dark)')
```

### Source Forms

`query` is a read-only value source and takes a plain `string`. Resolve a React ref or state value at the call site:

```tsx
const [query, setQuery] = useState('(min-width: 1024px)')

const matches = useMediaQuery(query) // re-binds when `query` changes
const refMatches = useMediaQuery(queryRef.current) // resolve a React ref at the call site
```

#### Server Side Rendering and Nuxt

If you are using `useMediaQuery` with SSR enabled, specify which screen size you would like to
render on the server and before hydration to avoid a hydration mismatch:

```tsx
const isLarge = useMediaQuery('(min-width: 1024px)', {
  ssrWidth: 768, // Will enable SSR mode and render like if the screen was 768px wide
})

console.log(isLarge) // always false because ssrWidth of 768px is smaller than 1024px
useEffect(() => {
  console.log(isLarge) // false if screen is smaller than 1024px, true if larger than 1024px
}, [isLarge])
```

Alternatively you can set this up globally for your app using [`SSRWidthProvider`](/core/useSSRWidth/): every
`useMediaQuery` below the provider renders against the provided width, so a per-hook `ssrWidth` is only needed to
override it.

```tsx
import { SSRWidthProvider } from '@reause/core'

<SSRWidthProvider width={768}>
  <App />
</SSRWidthProvider>
```

## Type Declarations

```ts
/**
 * Map from @vueuse/core `useMediaQuery`
 * (`source/vueuse/packages/core/useMediaQuery/`).
 *
 * @example
 * const isLargeScreen = useMediaQuery('(min-width: 1024px)')
 * const isPreferredDark = useMediaQuery('(prefers-color-scheme: dark)')
 */
export declare function useMediaQuery(
  query: string,
  options?: ConfigurableWindow & {
    ssrWidth?: number
  },
): boolean
```
