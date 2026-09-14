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
