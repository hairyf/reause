import type { WebFrame } from 'electron'
import { useCallback, useEffect, useRef, useState } from 'react'
import { resolveWebFrame } from '../_resolve'

/**
 * Setter returned by `useZoomLevel`: writes the level to `WebFrame.setZoomLevel` and updates the
 * value returned by the hook.
 */
export type ZoomLevelSetter = (value: number) => void

// upstream discriminates the overloads the same way: a number as the first
// argument means "no explicit WebFrame".
function isLevelArgument(value: WebFrame | number | undefined): value is number {
  return typeof value === 'number'
}

/**
 * Map from @vueuse/electron `useZoomLevel`
 * (`source/vueuse/packages/electron/useZoomLevel/`).
 *
 * @see https://www.electronjs.org/docs/api/web-frame#webframesetzoomlevellevel
 * @see https://vueuse.org/useZoomLevel
 *
 * @example
 * const [level, setLevel] = useZoomLevel()
 * console.log(level) // current zoom level
 * setLevel(2) // webFrame.setZoomLevel(2)
 *
 * @example
 * const [level] = useZoomLevel(webFrame, 2) // apply an explicit level on mount
 *
 * @__NO_SIDE_EFFECTS__
 */
export function useZoomLevel(level?: number): [number, ZoomLevelSetter]
export function useZoomLevel(webFrame: WebFrame, level?: number): [number, ZoomLevelSetter]
export function useZoomLevel(
  webFrameOrLevel?: WebFrame | number,
  level?: number,
): [number, ZoomLevelSetter] {
  const webFrame = isLevelArgument(webFrameOrLevel) ? undefined : webFrameOrLevel
  const externalLevel = isLevelArgument(webFrameOrLevel) ? webFrameOrLevel : level

  const instance = resolveWebFrame(webFrame)

  const resolvedLevel = externalLevel

  const [value, setValue] = useState<number>(() =>
    resolvedLevel === undefined ? instance.getZoomLevel() : resolvedLevel,
  )

  // the last level actually written to `webFrame` — `null` until the first
  // write, so an explicit level is still applied on mount
  const lastAppliedRef = useRef<number | null>(null)

  // upstream `watch(..., { immediate: true })`: the first run applies an
  // explicitly passed level on mount (a level-less call keeps `getZoomLevel()`)
  // and later runs re-apply when the external source value changes to a number
  // that differs from what was last written to `webFrame`.
  useEffect(() => {
    if (resolvedLevel === undefined || resolvedLevel === lastAppliedRef.current)
      return

    instance.setZoomLevel(resolvedLevel)
    lastAppliedRef.current = resolvedLevel
    setValue(resolvedLevel)
  }, [instance, resolvedLevel])

  const setLevel = useCallback<ZoomLevelSetter>((nextLevel) => {
    instance.setZoomLevel(nextLevel)
    lastAppliedRef.current = nextLevel
    setValue(nextLevel)
  }, [instance])

  return [value, setLevel]
}
