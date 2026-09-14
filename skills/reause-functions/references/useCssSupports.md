---
category: Browser
---

# useCssSupports

SSR compatible and reactive [`CSS.supports`](https://developer.mozilla.org/docs/Web/API/CSS/supports_static)

## Usage

```tsx
import { useCssSupports } from '@reause/core'

const { isSupported } = useCssSupports('container-type', 'scroll-state')
```

Both the single-argument condition-text form and the property + value form are supported, and every input accepts a
string or a React ref:

```tsx
import { useCssSupports } from '@reause/core'
import { useState } from 'react'

const [property, setProperty] = useState('display')
const [value, setValue] = useState('flex')
const { isSupported: propValueSupported } = useCssSupports(property, value)

const condition = { current: 'selector(:has(a))' }
const { isSupported: conditionSupported } = useCssSupports(condition)
```

### Server Side Rendering

During SSR and before the mount effect runs, the result is `options.ssrValue` (default `false`), so the server-rendered
HTML matches the pre-hydration client render:

```tsx
const { isSupported } = useCssSupports('display: flex', { ssrValue: false })
```

### React divergences

- **Return shape**: `isSupported` is a plain `boolean` (upstream returns a `ComputedRef<boolean>`), so the hook
  re-renders the component whenever a resolved input changes.
- **Falsy custom `window`**: passing a falsy `window` option (for example `useCssSupports('display: flex', { window: null, ssrValue: true })`)
  is treated as "no window available": `CSS.supports` is never evaluated and `isSupported` stays at `options.ssrValue`.
  Upstream only defaults an `undefined` `window` to `defaultWindow`, so a `null` window reaches `window?.CSS.supports(...)`
  and yields `undefined`; reause keeps the declared `boolean` state instead. This is reause-specific, non-upstream behavior.

## Type Declarations

```ts
/**
 * Options for `useCssSupports`: a custom `window` instance (e.g. working with iframes or in testing
 * environments) plus `ssrValue`, the result rendered while the browser `CSS.supports` API cannot be
 * evaluated.
 */
export interface UseCssSupportsOptions extends ConfigurableWindow {
  /**
   * Result rendered during SSR and before the mount effect evaluates `CSS.supports` on the client.
   *
   * @default false
   */
  ssrValue?: boolean
}
/**
 * Return of `useCssSupports` — mirrors the upstream `Supportable` shape, with `isSupported` as
 * plain boolean state.
 */
export interface UseCssSupportsReturn {
  /**
   * Whether the current environment supports the given CSS condition / property-value pair. Starts
   * at `options.ssrValue` (default `false`) and settles once the mount effect runs. When a falsy
   * custom `window` is passed, the effect never evaluates `CSS.supports`, so the value stays at
   * `options.ssrValue` (upstream yields `undefined` in that case).
   */
  isSupported: boolean
}
/**
 * Map from @vueuse/core `useCssSupports`
 * (`source/vueuse/packages/core/useCssSupports/`).
 *
 * @example
 * const { isSupported } = useCssSupports('container-type', 'scroll-state')
 * const { isSupported: flexbox } = useCssSupports('display: flex')
 */
export declare function useCssSupports(
  property: string,
  value: string,
  options?: UseCssSupportsOptions,
): UseCssSupportsReturn
export declare function useCssSupports(
  conditionText: string,
  options?: UseCssSupportsOptions,
): UseCssSupportsReturn
```
