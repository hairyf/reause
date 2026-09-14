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
 * Setter returned by `useZoomLevel`: writes the level to
 * `WebFrame.setZoomLevel` and updates the value returned by the hook.
 */
export type ZoomLevelSetter = (value: number) => void
/**
 * Reactive `WebFrame` zoom level — React port of VueUse's `useZoomLevel`.
 *
 * Map from @vueuse/electron `useZoomLevel`
 * (`source/vueuse/packages/electron/useZoomLevel/`). Upstream returns a
 * writable Vue `Ref<number>` whose setter writes to `WebFrame.setZoomLevel`;
 * this port follows the repo's state-like writable rule and returns the React
 * tuple `[level, setLevel]` instead.
 *
 * Adjustment for React:
 * - the writable ref becomes `const [level, setLevel] = useZoomLevel()` —
 *   `setLevel(value)` calls `webFrame.setZoomLevel(value)` and updates the
 *   returned level;
 * - upstream's `watch(level, cb, { immediate: true })` maps to a single sync
 *   effect keyed on `[webFrame, external level]` whose first run applies an
 *   explicitly passed level (upstream's immediate run) and re-applies when
 *   the source value changes. The last level written to `webFrame` is tracked
 *   in a ref, so a redundant render never re-writes the same level;
 * - upstream's `deepRef` passthrough is dropped: the level is a plain number,
 *   so there is no external ref to write back to;
 * - upstream has no range guard for zoom levels, so neither has this port —
 *   `0` is a valid level (upstream's `useZoomFactor` guard does not apply);
 * - the `WebFrame` instance is resolved once per render through the internal
 *   `resolveWebFrame` helper: pass it explicitly, or enable `nodeIntegration`
 *   so it can be read from `window.require('electron').webFrame`;
 * - `useZoomLevel()` reads the current level from `getZoomLevel()`, while
 *   `useZoomLevel(2)` / `useZoomLevel(webFrame, 2)` apply the level given as a
 *   plain number (upstream accepts a ref).
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
