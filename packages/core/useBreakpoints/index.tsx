import type { ConfigurableWindow } from '@reause/shared'
import { increaseWithUnit, pxValue } from '@reause/shared'
import { useEffect, useRef } from 'react'
import { useMediaQuery } from '../useMediaQuery'
import { useSSRWidth } from '../useSSRWidth'

/**
 * Breakpoints from Tailwind V2
 *
 * @see https://tailwindcss.com/docs/breakpoints
 */
export const breakpointsTailwind = {
  'sm': 640,
  'md': 768,
  'lg': 1024,
  'xl': 1280,
  '2xl': 1536,
}

/**
 * Breakpoints from Bootstrap V5
 *
 * @see https://getbootstrap.com/docs/5.0/layout/breakpoints
 */
export const breakpointsBootstrapV5 = {
  xs: 0,
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
  xxl: 1400,
}

/**
 * Breakpoints from Vuetify V2
 *
 * @see https://v2.vuetifyjs.com/en/features/breakpoints/
 */
export const breakpointsVuetifyV2 = {
  xs: 0,
  sm: 600,
  md: 960,
  lg: 1264,
  xl: 1904,
}

/**
 * Breakpoints from Vuetify V3
 *
 * @see https://vuetifyjs.com/en/styles/float/#overview
 */
export const breakpointsVuetifyV3 = {
  xs: 0,
  sm: 600,
  md: 960,
  lg: 1280,
  xl: 1920,
  xxl: 2560,
}

/**
 * Alias to `breakpointsVuetifyV2`
 *
 * @deprecated explictly use `breakpointsVuetifyV2` or `breakpointsVuetifyV3` instead
 */
export const breakpointsVuetify = breakpointsVuetifyV2

/**
 * Breakpoints from Ant Design
 *
 * @see https://ant.design/components/layout/#breakpoint-width
 */
export const breakpointsAntDesign = {
  xs: 480,
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
  xxl: 1600,
}

/**
 * Breakpoints from Quasar V2
 *
 * @see https://quasar.dev/style/breakpoints
 */
export const breakpointsQuasar = {
  xs: 0,
  sm: 600,
  md: 1024,
  lg: 1440,
  xl: 1920,
}

/**
 * Sematic Breakpoints
 */
export const breakpointsSematic = {
  mobileS: 320,
  mobileM: 375,
  mobileL: 425,
  tablet: 768,
  laptop: 1024,
  laptopL: 1440,
  desktop4K: 2560,
}

/**
 * Breakpoints from Master CSS
 *
 * @see https://docs.master.co/css/breakpoints
 */
export const breakpointsMasterCss = {
  '3xs': 360,
  '2xs': 480,
  'xs': 600,
  'sm': 768,
  'md': 1024,
  'lg': 1280,
  'xl': 1440,
  '2xl': 1600,
  '3xl': 1920,
  '4xl': 2560,
}

/**
 * Breakpoints from PrimeFlex
 *
 * @see https://primeflex.org/installation
 */
export const breakpointsPrimeFlex = {
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
}

/**
 * Breakpoints from ElementUI/ElementPlus
 *
 * @see https://element.eleme.io/#/en-US/component/layout
 * @see https://element-plus.org/en-US/component/layout.html
 */
export const breakpointsElement = {
  xs: 0,
  sm: 768,
  md: 992,
  lg: 1200,
  xl: 1920,
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
  strategy?: 'min-width' | 'max-width'
  ssrWidth?: number
}

export type UseBreakpointReturn<K extends string = string> = Record<K, boolean> & {
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
  active: () => K | ''
}

/**
 * Map from @vueuse/core `useBreakpoints`
 * (`source/vueuse/packages/core/useBreakpoints/`), which composes
 * `useMediaQuery` per breakpoint key and returns an object of shortcut methods (`.sm`, `.md`...)
 * plus comparison helpers. Reactively viewport breakpoints — an object mirror (not a tuple): every
 * breakpoint key becomes a plain boolean, e.g. `breakpoints.md` is `true` while the viewport is `>=
 * 768px` (with the default `min-width` strategy).
 *
 * React divergences:
 * - upstream's shortcut properties are `Object.defineProperty` getters that lazily create a
 * `useMediaQuery` `ComputedRef`; React hooks cannot be created at property-read time, so
 * `useBreakpoints` eagerly creates four `useMediaQuery` queries per key (min/max, each with the
 * ±0.1 delta that separates strict/equal comparisons) and exposes the resulting plain booleans. The
 * dynamic-key methods (`greaterOrEqual('sm')`...) return booleans from the current render, so the
 * `breakpoints` map and the keys passed to the methods must stay stable across renders (the number
 * of media queries cannot change between renders);
 * - upstream's `current()`/`active()` `computed` values become plain
 *   functions recomputed from the current render's booleans, so they stay
 *   in sync with media query changes (components re-render when the
 *   underlying `useMediaQuery` state flips);
 * - the `is*` helpers evaluate `window.matchMedia().matches` synchronously (non-reactive, matching
 * upstream) and fall back to `ssrWidth` comparisons while the `matchMedia` query is unavailable
 * (SSR / custom `window: null`);
 * - SSR via the `ssrWidth` option is evaluated inside the `useMediaQuery`
 *   mount effects, so the server renders the `false`/empty default without
 *   touching `window` and the simulated values appear after hydration —
 *   same caveat as `useMediaQuery`;
 * - `ssrWidth` comes from the per-hook `ssrWidth` option or, when that is
 *   omitted, from the closest `SSRWidthProvider` above the caller (read
 *   through `useSSRWidth()`, upstream's `provideSSRWidth`); the resolved
 *   width is then forwarded to every `useMediaQuery` this hook composes. The
 *   per-hook option takes precedence over the provided width, exactly like
 *   upstream's `const { ssrWidth = useSSRWidth() } = options`. Without a
 *   provider and without the option the hook keeps its plain client
 *   behaviour and never throws, so no `undefined` reaches the returned
 *   booleans.
 *
 * @example
 * const breakpoints = useBreakpoints(breakpointsTailwind)
 * const smAndLarger = breakpoints.greaterOrEqual('sm') // sm and larger
 * const largerThanSm = breakpoints.greater('sm') // only larger than sm
 * const lgAndSmaller = breakpoints.smallerOrEqual('lg') // lg and smaller
 * const smallerThanLg = breakpoints.smaller('lg') // only smaller than lg
 */
export function useBreakpoints<K extends string>(
  breakpoints: Breakpoints<K>,
  options: UseBreakpointsOptions = {},
): UseBreakpointReturn<K> {
  function getValue(k: K, delta?: number): string {
    let v = breakpoints[k]

    if (delta != null)
      v = increaseWithUnit(v, delta)

    return typeof v === 'number' ? `${v}px` : v
  }

  const { window: windowOption, strategy = 'min-width', ssrWidth: ssrWidthOption } = options

  // The per-hook option wins over the globally provided width (upstream:
  // `const { ssrWidth = useSSRWidth() } = options`); with neither, `ssrWidth`
  // stays `undefined` and the hook falls back to its client-only behaviour.
  const [providedWidth] = useSSRWidth()
  const ssrWidth = ssrWidthOption ?? providedWidth

  const ssrSupport = typeof ssrWidth === 'number'
  const mountedRef = useRef(false)

  useEffect(() => {
    mountedRef.current = true
  }, [])

  const trackedWindow = windowOption === undefined
    ? (typeof window === 'undefined' ? undefined : window)
    : windowOption

  function match(query: 'min' | 'max', size: string): boolean {
    // mirror upstream's `mounted` + ssrSupport branch: while the real
    // `matchMedia` result is unavailable (SSR, or a `window: null` custom
    // window), approximate the query from `ssrWidth`
    if (ssrSupport && !(mountedRef.current && trackedWindow)) {
      return query === 'min' ? ssrWidth! >= pxValue(size) : ssrWidth! <= pxValue(size)
    }
    if (!trackedWindow)
      return false
    return trackedWindow.matchMedia(`(${query}-width: ${size})`).matches
  }

  const keys = Object.keys(breakpoints) as K[]

  // upstream creates the `useMediaQuery` queries lazily from defineProperty
  // getters / method calls; React hooks cannot be created at call time, so
  // all four query variants are created up front for every breakpoint key
  // and the returned methods index into them
  const minWidths: Record<string, boolean> = {}
  const minPlusWidths: Record<string, boolean> = {}
  const maxWidths: Record<string, boolean> = {}
  const maxMinusWidths: Record<string, boolean> = {}
  const mediaOptions = { window: windowOption, ssrWidth }

  // the query strings are plain values (recomputed from the current render's
  // breakpoints) — `useMediaQuery` re-resolves its query every render and
  // re-binds whenever the resolved string changes, so passing a value keeps
  // the same reactivity without a getter
  for (const k of keys) {
    minWidths[k] = useMediaQuery(`(min-width: ${getValue(k)})`, mediaOptions)
    minPlusWidths[k] = useMediaQuery(`(min-width: ${getValue(k, 0.1)})`, mediaOptions)
    maxWidths[k] = useMediaQuery(`(max-width: ${getValue(k)})`, mediaOptions)
    maxMinusWidths[k] = useMediaQuery(`(max-width: ${getValue(k, -0.1)})`, mediaOptions)
  }

  const greaterOrEqual = (k: K) => minWidths[k]
  const smallerOrEqual = (k: K) => maxWidths[k]
  const greater = (k: K) => minPlusWidths[k]
  const smaller = (k: K) => maxMinusWidths[k]
  const between = (a: K, b: K) =>
    minWidths[a] && maxMinusWidths[b]

  const shortcutMethods = {} as Record<K, boolean>
  keys.forEach((k) => {
    shortcutMethods[k] = strategy === 'min-width' ? minWidths[k] : maxWidths[k]
  })

  function current(): K[] {
    return keys
      .map(k => [k, shortcutMethods[k], pxValue(getValue(k))] as const)
      .sort((a, b) => a[2] - b[2])
      .filter(([, v]) => v)
      .map(([k]) => k)
  }

  return Object.assign(shortcutMethods, {
    greaterOrEqual,
    smallerOrEqual,
    greater,
    smaller,
    between,
    isGreater: (k: K) => match('min', getValue(k, 0.1)),
    isGreaterOrEqual: (k: K) => match('min', getValue(k)),
    isSmaller: (k: K) => match('max', getValue(k, -0.1)),
    isSmallerOrEqual: (k: K) => match('max', getValue(k)),
    isInBetween: (a: K, b: K) =>
      match('min', getValue(a)) && match('max', getValue(b, -0.1)),
    current,
    active() {
      const bps = current()
      return bps.length === 0 ? '' : bps.at(strategy === 'min-width' ? -1 : 0)!
    },
  })
}
