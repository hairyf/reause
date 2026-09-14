import { useCallback, useEffect, useRef, useState } from 'react'

export interface EyeDropperOpenOptions {
  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal
   */
  signal?: AbortSignal
}

export interface EyeDropper {
  // eslint-disable-next-line ts/no-misused-new
  new(): EyeDropper
  open: (options?: EyeDropperOpenOptions) => Promise<{ sRGBHex: string }>
  [Symbol.toStringTag]: 'EyeDropper'
}

export interface UseEyeDropperOptions {
  /**
   * Initial sRGBHex.
   *
   * @default ''
   */
  initialValue?: string
}

export interface UseEyeDropperReturn {
  /**
   * Whether the `EyeDropper` API is available in the current environment. `false` during render and
   * on the server, resolved in a mount effect.
   */
  isSupported: boolean
  /**
   * The last color sampled by the eye dropper as an sRGB hex string. `''` before the first
   * successful `open()`.
   */
  sRGBHex: string
  /**
   * Opens the eye dropper picker. Resolves with `{ sRGBHex }` when a color is sampled and updates
   * the `sRGBHex` state; resolves `undefined` when the API is unsupported.
   */
  open: (openOptions?: EyeDropperOpenOptions) => Promise<{ sRGBHex: string } | undefined>
}

/**
 * Reactive [EyeDropper API](https://developer.mozilla.org/en-US/docs/Web/API/EyeDropper_API).
 *
 * Map from @vueuse/core `useEyeDropper`
 * (`source/vueuse/packages/core/useEyeDropper/`), which returns an object
 * mirroring the upstream `{ isSupported, open, sRGBHex }` members. `open` launches the browser's
 * native eye dropper picker, resolves with `{ sRGBHex }` and keeps the `sRGBHex` state fresh.
 *
 * React divergences:
 * - `isSupported` (upstream `useSupported`) becomes a plain boolean that
 *   starts `false` and is computed in the mount effect, so nothing touches
 *   `window` during render (SSR-safe);
 * - `open` is a stable callback that checks the mount-resolved support flag
 *   at call time (upstream reads the `isSupported` computed) and resolves
 *   `undefined` when the API is unavailable.
 *
 * @see https://vueuse.org/core/useEyeDropper/
 * @param options
 *
 * @example
 * const { isSupported, open, sRGBHex } = useEyeDropper()
 */
export function useEyeDropper(options: UseEyeDropperOptions = {}): UseEyeDropperReturn {
  const { initialValue = '' } = options
  const [isSupported, setIsSupported] = useState(false)
  const [sRGBHex, setSRGBHex] = useState(initialValue)
  const supportedRef = useRef(false)

  useEffect(() => {
    const supported = typeof window !== 'undefined' && 'EyeDropper' in window
    supportedRef.current = supported
    setIsSupported(supported)
  }, [])

  const open = useCallback(async (openOptions?: EyeDropperOpenOptions) => {
    if (!supportedRef.current)
      return
    const eyeDropper: EyeDropper = new (window as any).EyeDropper()
    const result = await eyeDropper.open(openOptions)
    setSRGBHex(result.sRGBHex)
    return result
  }, [])

  return { isSupported, sRGBHex, open }
}
