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
 * Map from @vueuse/core `useEyeDropper`
 * (`source/vueuse/packages/core/useEyeDropper/`).
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
