---
category: Browser
related:
  - useDark
  - usePreferredDark
  - useStorage
---

# useColorMode

Reactive color mode (dark / light / customs) with auto data persistence.

## Basic Usage

```tsx
import { useColorMode } from '@reause/core'

const [mode, setMode] = useColorMode()
```

By default, it will match with users' browser preference using `usePreferredDark` (a.k.a `auto` mode). When reading the state, it will by default return the current color mode (`dark`, `light` or your custom modes). The `auto` mode can be included in the returned modes by enabling the `emitAuto` option. When writing to the state, it will trigger DOM updates and persist the color mode to local storage (or your custom storage). You can pass `auto` to set back to auto mode.

```tsx
import { useColorMode } from '@reause/core'

const [mode, setMode] = useColorMode()
// ---cut---
mode // 'dark' | 'light'

setMode('dark') // change to dark mode and persist

setMode('auto') // change to auto mode
```

## Config

```tsx
import { useColorMode } from '@reause/core'

const [mode, setMode] = useColorMode({
  attribute: 'theme',
  modes: {
    // custom colors
    dim: 'dim',
    cafe: 'cafe',
  },
}) // 'dark' | 'light' | 'dim' | 'cafe'
```

## Advanced Usage

You can also explicit access to the system preference and storaged user override mode — in React the
storage key holds the raw (possibly `auto`) choice and `usePreferredDark` reports the system
preference:

```tsx
import { useColorMode, usePreferredDark, useStorage } from '@reause/core'

const [mode, setMode] = useColorMode()
const [store] = useStorage('vueuse-color-scheme', 'auto') // 'dark' | 'light' | 'auto'
const isDark = usePreferredDark() // system preference
```

## Component Usage

Not ported — upstream ships a `UseColorMode` component (Vue, render-slot based); in React the hook is used directly.

## Type Declarations

```ts
export type BasicColorMode = "light" | "dark"
export type BasicColorSchema = BasicColorMode | "auto"
export interface UseColorModeOptions<
  T extends string = BasicColorMode,
> extends UseStorageOptions<T | BasicColorMode> {
  /**
   * CSS Selector for the target element applying to
   *
   * @default 'html'
   */
  selector?: string | HTMLElement | null
  /**
   * HTML attribute applying the target element
   *
   * @default 'class'
   */
  attribute?: string
  /**
   * The initial color mode
   *
   * @default 'auto'
   */
  initialValue?: T | BasicColorSchema
  /**
   * Prefix when adding value to the attribute
   */
  modes?: Partial<Record<T | BasicColorSchema, string>>
  /**
   * A custom handler for handle the updates.
   * When specified, the default behavior will be overridden.
   *
   * @default undefined
   */
  onChanged?: (
    mode: T | BasicColorMode,
    defaultHandler: (mode: T | BasicColorMode) => void,
  ) => void
  /**
   * Custom storage ref
   *
   * When provided, the persistence layer is skipped entirely — no localStorage
   * read/write and no storage-event listener (`useStorage` is still called
   * internally for the rules of hooks, backed by an inert in-memory storage).
   * A `null` `storageRef.current` falls back to `initialValue`.
   */
  storageRef?: RefObject<T | BasicColorSchema>
  /**
   * Key to persist the data into localStorage/sessionStorage.
   *
   * Pass `null` to disable persistence
   *
   * @default 'vueuse-color-scheme'
   */
  storageKey?: string | null
  /**
   * Storage object, can be localStorage or sessionStorage
   */
  storage?: StorageLike
  /**
   * Emit `auto` mode from state
   *
   * When set to `true`, preferred mode won't be translated into `light` or `dark`.
   * This is useful when the fact that `auto` mode was selected needs to be known.
   *
   * @default undefined
   * @deprecated use the stored value when `auto` mode needs to be known
   * @see https://vueuse.org/core/useColorMode/#advanced-usage
   */
  emitAuto?: boolean
  /**
   * Disable transition on switch
   *
   * @see https://paco.me/writing/disable-theme-transitions
   * @default true
   */
  disableTransition?: boolean
}
export type UseColorModeReturn<T extends string = BasicColorMode> = [
  mode: T | BasicColorSchema,
  setMode: (mode: T | BasicColorSchema) => void,
]
/**
 * Reactive color mode (dark / light / customs) with auto data persistence —
 * React port of VueUse's `useColorMode`.
 *
 * Map from @vueuse/core `useColorMode`
 * (`source/vueuse/packages/core/useColorMode/`), which composes
 * `useStorage` + `usePreferredDark` and keeps the `html` (or a custom target)
 * element's `class`/attribute in sync with the resolved mode. By default the
 * mode starts `auto` — matching the user's browser preference through
 * `usePreferredDark` — and is persisted under the `storageKey`
 * ('vueuse-color-scheme') in `localStorage` (or a custom `storage`). Writing
 * `dark`/`light`/custom modes persists them and updates the DOM; writing
 * `auto` switches back to following the system preference.
 *
 * React divergences:
 * - the Vue `Ref<T | BasicColorSchema> & { store, system, state }` return
 *   becomes a `useState`-backed tuple `[mode, setMode]` — `mode` is the
 *   resolved mode ('dark' | 'light' | 'auto' with `emitAuto`, or custom
 *   modes), `setMode` writes and persists it. The `store` (raw persisted
 *   value) and `system` (raw system preference) surfaces are not exposed —
 *   the storage key can be read directly and `usePreferredDark` composes, and
 *   `mode` already reflects both through the `auto` translation;
 * - the DOM `class`/attribute update and the initial storage read run in a
 *   `useEffect` (upstream's `watch(state, ..., { immediate: true })` +
 *   `tryOnMounted`), so SSR renders the translated `initialValue` and only
 *   touches `window`/`document`/storage after mount. `state` changes only
 *   re-run the effect when the resolved mode actually changed (upstream's
 *   `flush: 'post'` watch);
 * - options are captured once at mount (upstream destructures them once at
 *   setup) — changing them between renders has no effect;
 * - `initialValue` is resolved once at mount; `storageRef` accepts a
 *   ref-like `{ current }` object as the external store, mirroring upstream's
 *   `Ref` — writes go to `storageRef.current` and trigger a re-render through
 *   internal state, and the current value is re-read on every render. When
 *   `storageRef` is provided the persistence layer is skipped entirely (no
 *   localStorage read/write, no storage-event listener); a `null`
 *   `storageRef.current` falls back to `initialMode`, whereas upstream's raw
 *   `store.value` passthrough would expose `null`;
 * - `selector` accepts a string (queried on every update) or a plain element
 *   / ref-like `{ current }` object (upstream's `ElementRef`).
 *
 * @example
 * const [mode, setMode] = useColorMode()
 *
 * setMode('dark') // change to dark mode and persist
 * setMode('auto') // switch back to auto mode
 *
 * @see https://vueuse.org/core/useColorMode/
 */
export declare function useColorMode<T extends string = BasicColorMode>(
  options?: UseColorModeOptions<T>,
): UseColorModeReturn<T>
```
