import type { WebFrame } from 'electron'
import { useCallback, useEffect, useRef, useState } from 'react'
import { resolveWebFrame } from '../_resolve'

/**
 * Setter returned by `useZoomFactor`: validates the factor, writes it to `WebFrame.setZoomFactor`
 * and updates the value returned by the hook.
 */
export type ZoomFactorSetter = (value: number) => void

const ZOOM_FACTOR_ERROR = 'the factor must be greater than 0.0.'

function assertZoomFactor(value: number): void {
  if (value === 0)
    throw new Error(ZOOM_FACTOR_ERROR)
}

// upstream discriminates the overloads the same way: a number as the first
// argument means "no explicit WebFrame".
function isFactorArgument(value: WebFrame | number | undefined): value is number {
  return typeof value === 'number'
}

/**
 * Reactive `WebFrame` zoom factor — React port of VueUse's `useZoomFactor`.
 *
 * Map from @vueuse/electron `useZoomFactor`
 * (`source/vueuse/packages/electron/useZoomFactor/`). Upstream returns a
 * writable Vue `Ref<number>` whose setter writes to `WebFrame.setZoomFactor`; this port follows the
 * repo's state-like writable rule and returns the React tuple `[factor, setFactor]` instead.
 *
 * React divergences:
 * - the writable ref becomes `const [factor, setFactor] = useZoomFactor()` —
 *   `setFactor(value)` validates the value, calls
 *   `webFrame.setZoomFactor(value)` and updates the returned factor;
 * - upstream's `watch(factor, cb, { immediate: true })` maps to a single
 *   effect keyed on `[webFrame, external factor]`: because the last-written ref
 *   starts as `null`, the immediate run is covered by the first effect run,
 *   which applies an explicitly passed factor once on mount and re-applies
 *   whenever the source value changes. The last factor written to `webFrame`
 *   is tracked in a ref, so a redundant render never re-writes the same
 *   factor;
 * - upstream's `0` guard is kept verbatim — `useZoomFactor(webFrame, 0)` and
 *   `setFactor(0)` both throw `the factor must be greater than 0.0.`;
 * - the `WebFrame` instance is resolved once per render through the internal
 *   `resolveWebFrame` helper: pass it explicitly, or enable `nodeIntegration`
 *   so it can be read from `window.require('electron').webFrame`;
 * - `useZoomFactor()` reads the current factor from `getZoomFactor()`, while
 *   `useZoomFactor(2)` / `useZoomFactor(webFrame, 2)` apply the factor given
 *   as a plain number (upstream accepts a ref).
 *
 * @see https://www.electronjs.org/docs/api/web-frame#webframesetzoomfactorfactor
 * @see https://vueuse.org/useZoomFactor
 *
 * @example
 * const [factor, setFactor] = useZoomFactor()
 * console.log(factor) // current zoom factor
 * setFactor(2) // webFrame.setZoomFactor(2)
 *
 * @example
 * const [factor] = useZoomFactor(webFrame, 2) // apply an explicit factor on mount
 *
 * @__NO_SIDE_EFFECTS__
 */
export function useZoomFactor(factor?: number): [number, ZoomFactorSetter]
export function useZoomFactor(webFrame: WebFrame, factor?: number): [number, ZoomFactorSetter]
export function useZoomFactor(
  webFrameOrFactor?: WebFrame | number,
  factor?: number,
): [number, ZoomFactorSetter] {
  const webFrame = isFactorArgument(webFrameOrFactor) ? undefined : webFrameOrFactor
  const externalFactor = isFactorArgument(webFrameOrFactor) ? webFrameOrFactor : factor

  const instance = resolveWebFrame(webFrame)

  const resolvedFactor = externalFactor
  if (resolvedFactor !== undefined)
    assertZoomFactor(resolvedFactor)

  const [value, setValue] = useState<number>(() =>
    resolvedFactor === undefined ? instance.getZoomFactor() : resolvedFactor,
  )

  // the last factor actually written to `webFrame` — `null` until the first
  // write, so an explicit factor is still applied on mount
  const lastAppliedRef = useRef<number | null>(null)

  // upstream watcher: the first run (with `lastAppliedRef` still `null`) is
  // upstream's `immediate: true` run — it applies an explicitly passed factor
  // once on mount and re-applies whenever the external source value changes to
  // a number that differs from what was last written to `webFrame`.
  useEffect(() => {
    if (resolvedFactor === undefined || resolvedFactor === lastAppliedRef.current)
      return

    assertZoomFactor(resolvedFactor)
    instance.setZoomFactor(resolvedFactor)
    lastAppliedRef.current = resolvedFactor
    setValue(resolvedFactor)
  }, [instance, resolvedFactor])

  const setFactor = useCallback<ZoomFactorSetter>((nextFactor) => {
    assertZoomFactor(nextFactor)
    instance.setZoomFactor(nextFactor)
    lastAppliedRef.current = nextFactor
    setValue(nextFactor)
  }, [instance])

  return [value, setFactor]
}
