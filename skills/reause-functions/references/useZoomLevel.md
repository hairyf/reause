---
category: '@Electron'
---

# useZoomLevel

Reactive [WebFrame](https://www.electronjs.org/docs/api/web-frame#webframe) zoom level.

## Usage

```tsx
import { useZoomLevel } from '@reause/electron'

// enable nodeIntegration if you don't provide webFrame explicitly
// see: https://www.electronjs.org/docs/api/webview-tag#nodeintegration
// tuple result will return
const [level, setLevel] = useZoomLevel()
console.log(level) // print current zoom level
setLevel(2) // change current zoom level
```

Set initial zoom level immediately

```tsx
import { useZoomLevel } from '@reause/electron'

const [level] = useZoomLevel(2)
```

Pass a state value and the level will be updated when the source value changes

```tsx
import { useZoomLevel } from '@reause/electron'
import { useState } from 'react'

const [level, setLevel] = useState(1)

useZoomLevel(level) // zoom level will match with the state

setLevel(2) // zoom level will change
```

## Type Declarations

```ts
/**
 * Setter returned by `useZoomLevel`: writes the level to `WebFrame.setZoomLevel` and updates the
 * value returned by the hook.
 */
export type ZoomLevelSetter = (value: number) => void
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
export declare function useZoomLevel(level?: number): [number, ZoomLevelSetter]
export declare function useZoomLevel(
  webFrame: WebFrame,
  level?: number,
): [number, ZoomLevelSetter]
```
