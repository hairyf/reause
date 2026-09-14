---
category: Browser
---

# useBreakpoints

Reactive viewport breakpoints

## Usage

```tsx
import { breakpointsTailwind, useBreakpoints } from '@reause/core'

const breakpoints = useBreakpoints(breakpointsTailwind)

const smAndLarger = breakpoints.greaterOrEqual('sm') // sm and larger
const largerThanSm = breakpoints.greater('sm') // only larger than sm
const lgAndSmaller = breakpoints.smallerOrEqual('lg') // lg and smaller
const smallerThanLg = breakpoints.smaller('lg') // only smaller than lg
```

```tsx
import { useBreakpoints } from '@reause/core'

const breakpoints = useBreakpoints({
  mobile: 0, // optional
  tablet: 640,
  laptop: 1024,
  desktop: 1280,
})

// Can be 'mobile' or 'tablet' or 'laptop' or 'desktop'
const activeBreakpoint = breakpoints.active()

// true or false
const laptop = breakpoints.between('laptop', 'desktop')
```

### Shortcut Methods

You can access breakpoints directly as properties on the returned object. These are reactive booleans.

```ts
const breakpoints = useBreakpoints({
  tablet: 640,
  laptop: 1024,
})

// Equivalent to breakpoints.greaterOrEqual('tablet') with min-width strategy
const isTablet = breakpoints.tablet
```

### Strategy

The `strategy` option controls how the shortcut properties behave:

- `min-width` (default, mobile-first): `breakpoints.lg` is `true` when viewport is `>= lg`
- `max-width` (desktop-first): `breakpoints.lg` is `true` when viewport is `< xl`

```ts
const breakpoints = useBreakpoints(breakpointsTailwind, {
  strategy: 'max-width', // desktop-first
})
```

### Available Methods

| Method                | Description                               |
| --------------------- | ----------------------------------------- |
| `greaterOrEqual(k)`   | Reactive: viewport width >= breakpoint    |
| `greater(k)`          | Reactive: viewport width > breakpoint     |
| `smallerOrEqual(k)`   | Reactive: viewport width <= breakpoint    |
| `smaller(k)`          | Reactive: viewport width < breakpoint     |
| `between(a, b)`       | Reactive: viewport width between a and b  |
| `isGreaterOrEqual(k)` | Non-reactive: returns boolean immediately |
| `isGreater(k)`        | Non-reactive: returns boolean immediately |
| `isSmallerOrEqual(k)` | Non-reactive: returns boolean immediately |
| `isSmaller(k)`        | Non-reactive: returns boolean immediately |
| `isInBetween(a, b)`   | Non-reactive: returns boolean immediately |
| `current()`           | Array of all matching breakpoints         |
| `active()`            | String of the current active breakpoint   |

#### Server Side Rendering and Nuxt

If you are using `useBreakpoints` with SSR enabled, then you need to specify which screen size you would like to render
on the server and before hydration to avoid a hydration mismatch

```ts
import { breakpointsTailwind, useBreakpoints } from '@reause/core'

const breakpoints = useBreakpoints(breakpointsTailwind, {
  ssrWidth: 768 // Will enable SSR mode and render like if the screen was 768px wide
})
```

Alternatively you can set this up globally for your app using [`SSRWidthProvider`](/core/useSSRWidth/): every
`useBreakpoints` below the provider renders against the provided width, so a per-hook `ssrWidth` is only needed to
override it.

```tsx
import { SSRWidthProvider } from '@reause/core'

<SSRWidthProvider width={768}>
  <App />
</SSRWidthProvider>
```

## Presets

- Tailwind: `breakpointsTailwind`
- Bootstrap v5: `breakpointsBootstrapV5`
- Vuetify v2: `breakpointsVuetifyV2` (deprecated: `breakpointsVuetify`)
- Vuetify v3: `breakpointsVuetifyV3`
- Ant Design: `breakpointsAntDesign`
- Quasar v2: `breakpointsQuasar`
- Sematic: `breakpointsSematic`
- Master CSS: `breakpointsMasterCss`
- Prime Flex: `breakpointsPrimeFlex`
- ElementUI / ElementPlus: `breakpointsElement`

_Breakpoint presets are standalone exported objects (they are not returned by `useBreakpoints`), so import the preset you
need explicitly:_

```js
import { breakpointsTailwind } from '@reause/core'
// and so on
```

## Type Declarations

```ts
/**
 * Breakpoints from Tailwind V2
 *
 * @see https://tailwindcss.com/docs/breakpoints
 */
export declare const breakpointsTailwind: {
  sm: number
  md: number
  lg: number
  xl: number
  "2xl": number
}
/**
 * Breakpoints from Bootstrap V5
 *
 * @see https://getbootstrap.com/docs/5.0/layout/breakpoints
 */
export declare const breakpointsBootstrapV5: {
  xs: number
  sm: number
  md: number
  lg: number
  xl: number
  xxl: number
}
/**
 * Breakpoints from Vuetify V2
 *
 * @see https://v2.vuetifyjs.com/en/features/breakpoints/
 */
export declare const breakpointsVuetifyV2: {
  xs: number
  sm: number
  md: number
  lg: number
  xl: number
}
/**
 * Breakpoints from Vuetify V3
 *
 * @see https://vuetifyjs.com/en/styles/float/#overview
 */
export declare const breakpointsVuetifyV3: {
  xs: number
  sm: number
  md: number
  lg: number
  xl: number
  xxl: number
}
/**
 * Alias to `breakpointsVuetifyV2`
 *
 * @deprecated explictly use `breakpointsVuetifyV2` or `breakpointsVuetifyV3` instead
 */
export declare const breakpointsVuetify: {
  xs: number
  sm: number
  md: number
  lg: number
  xl: number
}
/**
 * Breakpoints from Ant Design
 *
 * @see https://ant.design/components/layout/#breakpoint-width
 */
export declare const breakpointsAntDesign: {
  xs: number
  sm: number
  md: number
  lg: number
  xl: number
  xxl: number
}
/**
 * Breakpoints from Quasar V2
 *
 * @see https://quasar.dev/style/breakpoints
 */
export declare const breakpointsQuasar: {
  xs: number
  sm: number
  md: number
  lg: number
  xl: number
}
/**
 * Sematic Breakpoints
 */
export declare const breakpointsSematic: {
  mobileS: number
  mobileM: number
  mobileL: number
  tablet: number
  laptop: number
  laptopL: number
  desktop4K: number
}
/**
 * Breakpoints from Master CSS
 *
 * @see https://docs.master.co/css/breakpoints
 */
export declare const breakpointsMasterCss: {
  "3xs": number
  "2xs": number
  xs: number
  sm: number
  md: number
  lg: number
  xl: number
  "2xl": number
  "3xl": number
  "4xl": number
}
/**
 * Breakpoints from PrimeFlex
 *
 * @see https://primeflex.org/installation
 */
export declare const breakpointsPrimeFlex: {
  sm: number
  md: number
  lg: number
  xl: number
}
/**
 * Breakpoints from ElementUI/ElementPlus
 *
 * @see https://element.eleme.io/#/en-US/component/layout
 * @see https://element-plus.org/en-US/component/layout.html
 */
export declare const breakpointsElement: {
  xs: number
  sm: number
  md: number
  lg: number
  xl: number
}
export type Breakpoints<K extends string = string> = Record<K, number | string>
export interface UseBreakpointsOptions extends ConfigurableWindow {
  /**
   * The query strategy to use for the generated shortcut methods like `.lg`
   *
   * 'min-width' -.lg will be true when the viewport is greater than or equal to the lg breakpoint
   * (mobile-first) 'max-width' -.lg will be true when the viewport is smaller than the xl
   * breakpoint (desktop-first)
   *
   * @default "min-width"
   */
  strategy?: "min-width" | "max-width"
  ssrWidth?: number
}
export type UseBreakpointReturn<K extends string = string> = Record<
  K,
  boolean
> & {
  greaterOrEqual: (k: K) => boolean
  smallerOrEqual: (k: K) => boolean
  greater: (k: K) => boolean
  smaller: (k: K) => boolean
  between: (a: K, b: K) => boolean
  isGreater: (k: K) => boolean
  isGreaterOrEqual: (k: K) => boolean
  isSmaller: (k: K) => boolean
  isSmallerOrEqual: (k: K) => boolean
  isInBetween: (a: K, b: K) => boolean
  current: () => K[]
  active: () => K | ""
}
/**
 * Map from @vueuse/core `useBreakpoints`
 * (`source/vueuse/packages/core/useBreakpoints/`).
 *
 * @example
 * const breakpoints = useBreakpoints(breakpointsTailwind)
 * const smAndLarger = breakpoints.greaterOrEqual('sm') // sm and larger
 * const largerThanSm = breakpoints.greater('sm') // only larger than sm
 * const lgAndSmaller = breakpoints.smallerOrEqual('lg') // lg and smaller
 * const smallerThanLg = breakpoints.smaller('lg') // only smaller than lg
 */
export declare function useBreakpoints<K extends string>(
  breakpoints: Breakpoints<K>,
  options?: UseBreakpointsOptions,
): UseBreakpointReturn<K>
```
