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
 * Setter returned by `useZoomFactor`: validates the factor, writes it to
 * `WebFrame.setZoomFactor` and updates the value returned by the hook.
 */
export type ZoomFactorSetter = (value: number) => void
/**
 * Reactive `WebFrame` zoom factor — React port of VueUse's `useZoomFactor`.
 *
 * Map from @vueuse/electron `useZoomFactor`
 * (`source/vueuse/packages/electron/useZoomFactor/`). Upstream returns a
 * writable Vue `Ref<number>` whose setter writes to
 * `WebFrame.setZoomFactor`; this port follows the repo's state-like writable
 * rule and returns the React tuple `[factor, setFactor]` instead.
 *
 * Adjustment for React:
 * - the writable ref becomes `const [factor, setFactor] = useZoomFactor()` —
 *   `setFactor(value)` validates the value, calls
 *   `webFrame.setZoomFactor(value)` and updates the returned factor;
 * - upstream's `watch(factor, cb, { immediate: true })` maps to a single
 *   effect keyed on `[webFrame, external factor]`: because the last-written ref
 *   starts as `null`, the immediate run is covered by the first effect run,
 *   which applies an explicitly passed factor once on mount and re-applies
 *   whenever the source value changes. The last factor written to `webFrame`
 *   is tracked in a ref, so a redundant render never re-writes the same
 *   factor;
 * - upstream's `0` guard is kept verbatim — `useZoomFactor(webFrame, 0)` and
 *   `setFactor(0)` both throw `the factor must be greater than 0.0.`;
 * - the `WebFrame` instance is resolved once per render through the internal
 *   `resolveWebFrame` helper: pass it explicitly, or enable `nodeIntegration`
 *   so it can be read from `window.require('electron').webFrame`;
 * - `useZoomFactor()` reads the current factor from `getZoomFactor()`, while
 *   `useZoomFactor(2)` / `useZoomFactor(webFrame, 2)` apply the factor given
 *   as a plain number (upstream accepts a ref).
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
