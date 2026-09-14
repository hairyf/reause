---
category: '@Electron'
---

# useZoomFactor

Reactive [WebFrame](https://www.electronjs.org/docs/api/web-frame#webframe) zoom factor.

## Usage

```tsx
import { useZoomFactor } from '@reause/electron'

// enable nodeIntegration if you don't provide webFrame explicitly
// see: https://www.electronjs.org/docs/api/webview-tag#nodeintegration
// tuple result will return
const [factor, setFactor] = useZoomFactor()
console.log(factor) // print current zoom factor
setFactor(2) // change current zoom factor
```

Set initial zoom factor immediately

```tsx
import { useZoomFactor } from '@reause/electron'

const [factor] = useZoomFactor(2)
```

Pass a state value and the factor will be updated when the source value changes

```tsx
import { useZoomFactor } from '@reause/electron'
import { useState } from 'react'

const [factor, setFactor] = useState(1)

useZoomFactor(factor) // zoom factor will match with the state

setFactor(2) // zoom factor will change
```

## Type Declarations

```ts
/**
 * Setter returned by `useZoomFactor`: validates the factor, writes it to `WebFrame.setZoomFactor`
 * and updates the value returned by the hook.
 */
export type ZoomFactorSetter = (value: number) => void
/**
 * Map from @vueuse/electron `useZoomFactor`
 * (`source/vueuse/packages/electron/useZoomFactor/`).
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
export declare function useZoomFactor(
  factor?: number,
): [number, ZoomFactorSetter]
export declare function useZoomFactor(
  webFrame: WebFrame,
  factor?: number,
): [number, ZoomFactorSetter]
```
