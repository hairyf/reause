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
 * Options for `useCssSupports`: a custom `window` instance (e.g. working with
 * iframes or in testing environments) plus `ssrValue`, the result rendered
 * while the browser `CSS.supports` API cannot be evaluated.
 */
export interface UseCssSupportsOptions extends ConfigurableWindow {
  /**
   * Result rendered during SSR and before the mount effect evaluates
   * `CSS.supports` on the client.
   *
   * @default false
   */
  ssrValue?: boolean
}
/**
 * Return of `useCssSupports` — mirrors the upstream `Supportable` shape, with
 * `isSupported` as plain boolean state (upstream: `ComputedRef<boolean>`).
 */
export interface UseCssSupportsReturn {
  /**
   * Whether the current environment supports the given CSS condition /
   * property-value pair. Starts at `options.ssrValue` (default `false`) and
   * settles once the mount effect runs. When a falsy custom `window` is
   * passed, the effect never evaluates `CSS.supports`, so the value stays at
   * `options.ssrValue` (upstream yields `undefined` in that case).
   */
  isSupported: boolean
}
/**
 * SSR compatible and reactive [`CSS.supports`](https://developer.mozilla.org/docs/Web/API/CSS/supports_static).
 *
 * Map from @vueuse/core `useCssSupports`
 * (`source/vueuse/packages/core/useCssSupports/`), which returns a
 * `computed` boolean gated on `useMounted` and evaluates
 * `window.CSS.supports` with the resolved property / value (two-argument
 * form) or the condition text (single-argument form).
 *
 * React divergences:
 * - the Vue `computed<boolean>` return becomes a plain boolean state in
 *   `{ isSupported }`, so components re-render whenever the resolved inputs
 *   change and the support result is recomputed;
 * - `property` / `value` / `conditionText` accept a plain string or a ref-like
 *   `{ current }` object (upstream `MaybeRefOrGetter`); they are
 *   re-resolved on every render and `CSS.supports` is re-evaluated in an
 *   effect whenever a resolved input changes;
 * - the upstream `useMounted` gate is implicit: the evaluation lives in the
 *   mount effect, which never runs during render or on the server, so SSR
 *   (and the first client render) produce `options.ssrValue` (default
 *   `false`) without touching `window` — matching upstream's computed;
 * - a *falsy* custom `window` (e.g. `{ window: null }`) is treated as "no
 *   window": the mount effect returns early and `isSupported` stays at
 *   `options.ssrValue` (divergence). Upstream only defaults an `undefined`
 *   window to `defaultWindow`, so `{ window: null }` reaches
 *   `window?.CSS.supports(...)` and yields `undefined`; reause deliberately
 *   keeps the declared `boolean` state instead of surfacing `undefined`;
 * - the two overloads are detected like upstream: a trailing argument that
 *   resolves to an object is treated as the options bag, otherwise two
 *   arguments mean property + value.
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
