import type { JwtDecodeOptions, JwtHeader, JwtPayload } from 'jwt-decode'
import { jwtDecode } from 'jwt-decode'
import { useMemo, useRef } from 'react'

export interface UseJwtOptions<Fallback> {
  /**
   * Value returned when encounter error on decoding
   *
   * @default null
   */
  fallbackValue?: Fallback

  /**
   * Error callback for decoding
   */
  onError?: (error: unknown) => void
}

/**
 * React return type: a plain object with two distinct-typed named fields — the value analog of the
 * upstream `ComputedRef`s. `header` and `payload` are decoded values (or `Fallback`), NOT refs.
 */
export interface UseJwtReturn<Payload, Header, Fallback> {
  header: Header | Fallback
  payload: Payload | Fallback
}

/**
 * Map from @vueuse/integrations `useJwt`
 * (`source/vueuse/packages/integrations/useJwt/`).
 *
 * @__NO_SIDE_EFFECTS__
 * @see https://vueuse.org/useJwt
 * @example
 * const { header, payload } = useJwt(encodedJwt)
 * header.alg // 'HS256'
 * payload.sub // '1234567890'
 */
export function useJwt<
  Payload extends object = JwtPayload,
  Header extends object = JwtHeader,
  Fallback = null,
>(
  encodedJwt: string,
  options: UseJwtOptions<Fallback> = {},
): UseJwtReturn<Payload, Header, Fallback> {
  const {
    onError,
    fallbackValue = null,
  } = options

  // latest `onError` in a ref: an inline arrow is a new function every render
  // and would otherwise invalidate the memos below on every render
  const onErrorRef = useRef(onError)
  onErrorRef.current = onError

  // latest `fallbackValue` in a ref, read at decode time like `onError` — so
  // the memos depend on the token alone (upstream's computed deps are
  // token-only), keeping `header`/`payload` referentially stable for a stable
  // token even when the options object is recreated each render
  const fallbackValueRef = useRef(fallbackValue)
  fallbackValueRef.current = fallbackValue

  const token = encodedJwt

  const decodeWithFallback = <T extends object>(value: string, jwtOptions?: JwtDecodeOptions): T | Fallback => {
    try {
      return jwtDecode<T>(value, jwtOptions)
    }
    catch (err) {
      onErrorRef.current?.(err)
      return fallbackValueRef.current as Fallback
    }
  }

  const header = useMemo(() => decodeWithFallback<Header>(token, { header: true }), [token])
  const payload = useMemo(() => decodeWithFallback<Payload>(token), [token])

  return {
    header,
    payload,
  }
}
