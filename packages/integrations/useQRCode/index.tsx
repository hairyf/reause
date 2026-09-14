import { isClient } from '@reause/shared'
import * as QRCode from 'qrcode'
import { useEffect, useState } from 'react'

/**
 * Map from @vueuse/integrations `useQRCode`
 * (`source/vueuse/packages/integrations/useQRCode/`).
 *
 * @__NO_SIDE_EFFECTS__
 * @see https://vueuse.org/useQRCode
 * @param text - the text to encode (plain string)
 * @param options - `qrcode` `toDataURL` options, memoized by the caller
 * @example
 * const qrcode = useQRCode('https://vueuse.org')
 * qrcode // '' at first, then 'data:image/png;base64,…'
 */
export function useQRCode(
  text: string,
  options?: QRCode.QRCodeToDataURLOptions,
): string {
  const value = text
  const [result, setResult] = useState('')

  useEffect(() => {
    if (!value || !isClient)
      return
    let cancelled = false
    QRCode.toDataURL(value, options).then((url) => {
      if (!cancelled)
        setResult(url)
    })
    return () => {
      cancelled = true
    }
  }, [value, options])

  return result
}
