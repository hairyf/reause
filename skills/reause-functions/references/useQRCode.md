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

### Value source

`text` is the hook's **read-only value source** and takes a plain string (upstream:
`MaybeRefOrGetter<string>`). A changed `text` prop re-encodes on the next render:

```tsx
const [text, setText] = useState('text-to-encode')
const qrcode = useQRCode(text) // setText(next) re-encodes on the next render
```

```tsx
<>
  <input type="text" value={text} onChange={event => setText(event.target.value)} />
  <img src={qrcode} alt="QR Code" />
</>
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
