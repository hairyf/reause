import type { ConfigurableWindow } from '@reause/shared'
import { isClient } from '@reause/shared'
import { useEffect, useState } from 'react'

/**
 * Options for `useCssSupports`: a custom `window` instance (e.g. working with iframes or in testing
 * environments) plus `ssrValue`, the result rendered while the browser `CSS.supports` API cannot be
 * evaluated.
 */
export interface UseCssSupportsOptions extends ConfigurableWindow {
  /**
   * Result rendered during SSR and before the mount effect evaluates `CSS.supports` on the client.
   *
   * @default false
   */
  ssrValue?: boolean
}

/**
 * Return of `useCssSupports` — mirrors the upstream `Supportable` shape, with `isSupported` as
 * plain boolean state.
 */
export interface UseCssSupportsReturn {
  /**
   * Whether the current environment supports the given CSS condition / property-value pair. Starts
   * at `options.ssrValue` (default `false`) and settles once the mount effect runs. When a falsy
   * custom `window` is passed, the effect never evaluates `CSS.supports`, so the value stays at
   * `options.ssrValue` (upstream yields `undefined` in that case).
   */
  isSupported: boolean
}

// `CSS` is a global in the DOM lib but not a `Window` member, hence the
// structural cast below (upstream annotates the same with
// `@ts-expect-error window type is not correct`). The `value` parameter is
// optional so one property signature covers both the condition-text and the
// property + value overloads.
type WindowWithCss = Window & {
  CSS: {
    supports: (propertyOrCondition: string, value?: string) => boolean
  }
}

/**
 * Map from @vueuse/core `useCssSupports`
 * (`source/vueuse/packages/core/useCssSupports/`).
 *
 * @example
 * const { isSupported } = useCssSupports('container-type', 'scroll-state')
 * const { isSupported: flexbox } = useCssSupports('display: flex')
 */
export function useCssSupports(
  property: string,
  value: string,
  options?: UseCssSupportsOptions,
): UseCssSupportsReturn
export function useCssSupports(
  conditionText: string,
  options?: UseCssSupportsOptions,
): UseCssSupportsReturn
export function useCssSupports(...args: any[]): UseCssSupportsReturn {
  // Upstream overload detection: an object trailing argument is the
  // options bag (mirrors `typeof args.at(-1) === 'object'`).
  const last = args.at(-1)
  const hasOptions = typeof last === 'object'
  const options: UseCssSupportsOptions = hasOptions ? last : {}
  const argCount = hasOptions ? args.length - 1 : args.length

  const { window: windowOption, ssrValue = false } = options
  const [isSupported, setIsSupported] = useState(ssrValue)

  // Re-resolved on every render so a changed plain input re-evaluates
  // `CSS.supports` (upstream reactivity).
  const prop = args[0]
  const value = args[1]
  const trackedWindow = windowOption === undefined
    ? (typeof window === 'undefined' ? undefined : window)
    : windowOption

  useEffect(() => {
    if (!isClient || !trackedWindow)
      return

    const result = argCount === 2
      ? (trackedWindow as WindowWithCss).CSS.supports(prop, value)
      : (trackedWindow as WindowWithCss).CSS.supports(prop)
    setIsSupported(result)
  }, [argCount, prop, value, trackedWindow])

  return { isSupported }
}
