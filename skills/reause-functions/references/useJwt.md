---
category: '@Integrations'
---

# useJwt

Wrapper for [`jwt-decode`](https://github.com/auth0/jwt-decode).

## Install

```bash
npm i jwt-decode@^4
```

## Usage

```tsx
import { useJwt } from '@reause/integrations'

const encodedJwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiaWF0IjoxNTE2MjM5MDIyfQ.L8i6g3PfcHlioHCCPURC9pmXT7gdJpx3kOoyAfNUwCc'
const { header, payload } = useJwt(encodedJwt)
```

## Type Declarations

```ts
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
export declare function useJwt<
  Payload extends object = JwtPayload,
  Header extends object = JwtHeader,
  Fallback = null,
>(
  encodedJwt: string,
  options?: UseJwtOptions<Fallback>,
): UseJwtReturn<Payload, Header, Fallback>
```
