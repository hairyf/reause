---
category: '@Integrations'
---

# useQRCode

Wrapper for [`qrcode`](https://github.com/soldair/node-qrcode).

## Install

```bash
npm i qrcode@^1
```

## Usage

```tsx
import { useQRCode } from '@reause/integrations'

// `qrcode` is the data URL, `''` until the first encode resolves
const qrcode = useQRCode('text-to-encode')
```

## Type Declarations

```ts
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
export declare function useQRCode(
  text: string,
  options?: QRCode.QRCodeToDataURLOptions,
): string
```
