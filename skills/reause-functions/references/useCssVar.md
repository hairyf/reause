---
category: Browser
---

# useCssVar

Manipulate CSS variables

## Usage

```tsx
import { useCssVar } from '@reause/core'
import { useRef } from 'react'

const el = useRef<HTMLDivElement>(null)
const [color1, setColor1] = useCssVar('--color', el)
// force a re-render (e.g. with your own state) once `el` is populated

const [key] = useState('--color')
const [colorVal, setColorVal] = useCssVar(key, el)

const [color2, setColor2] = useCssVar('--color', el, { initialValue: '#eee' })
setColor2(null) // removes the --color property from the element
```

## Options

### initialValue

- Type: `string`
- Default: `undefined`

Initial value, also the SSR default — no `document` access happens during render.

### observe

- Type: `boolean`
- Default: `false`

Track external changes to the variable with a `MutationObserver` (upstream composes `useMutationObserver` with `{ attributeFilter: ['style', 'class'] }`). The observer only updates the returned state, since the DOM already holds the change. It is created from the configured `window`; when that window has no `MutationObserver`, observation is skipped silently.

### window

- Type: `Window`
- Default: the global `window` (`undefined` on the server)

The window object used to read the computed style and to construct the `MutationObserver`, e.g. to work with iframes or in tests.

## Type Declarations

```ts
/**
 * Options for `useCssVar`: an optional `initialValue` (also the SSR default —
 * no `document` access happens during render) and an `observe` flag that
 * tracks external changes with a MutationObserver.
 */
export interface UseCssVarOptions extends ConfigurableWindow {
  /**
   * Initial value, also the SSR default — no `document` access happens during
   * render.
   *
   * @default undefined
   */
  initialValue?: string
  /**
   * Use MutationObserver to monitor variable changes. The observer is created
   * from the configured `window`; when that window has no `MutationObserver`,
   * observation is skipped silently.
   *
   * @default false
   */
  observe?: boolean
}
/**
 * Elements accepted as the CSS variable target — a React ref object holding the
 * element (upstream: `ElementRef`).
 */
export type UseCssVarElement = HTMLElement | SVGElement | null | undefined
/**
 * Return of `useCssVar`: a writable `[value, setValue]` tuple (upstream
 * returns a single `ShallowRef`).
 */
export type UseCssVarReturn = [
  value: string | null | undefined,
  setValue: Dispatch<SetStateAction<string | null | undefined>>,
]
/**
 * Manipulate CSS variables.
 *
 * Map from @vueuse/core `useCssVar`
 * (`source/vueuse/packages/core/useCssVar/`). Reads the value of a CSS custom
 * property on an element (or on `document.documentElement` when no `target`
 * is given), keeps it in state and writes changes back to the element's
 * inline style. Setting `null`/`undefined` through the setter removes the
 * property.
 *
 * Return tuple follows this repo's React idiom (see hairyf/reause#100) —
 * upstream returns a single writable Vue `ShallowRef`, here it becomes
 * `const [value, setValue] = useCssVar('--color', el)`.
 *
 * React divergences:
 * - the two upstream `watch`es become `useEffect`s: the read/sync effect
 *   re-reads the computed style when the resolved target or the prop value
 *   changes (removing the previous key from the previous element first, as
 *   upstream's watcher does), and the write effect applies the state back to
 *   the element whenever the value or target changes;
 * - the prop is a plain value read on every render, so a key
 *   change is picked up on the next render (upstream re-fires its watcher via
 *   reactive refs); the target is a `RefObject` resolved with `unrefElement`;
 * - the optional MutationObserver (upstream composes `useMutationObserver`
 *   with `{ attributeFilter: ['style', 'class'] }`) is a self-contained
 *   observer inside an effect, disconnected on unmount — like upstream it only
 *   updates the state, since the DOM is already the source of the change; it is
 *   built from the configured `window` and skipped silently when that window
 *   has no `MutationObserver` (upstream's per-window support guard);
 * - SSR-safe: the value initializes from `initialValue` during render, the
 *   first DOM read happens in a mount effect, and a nullish initial value is
 *   never written back before that read ran (mirroring upstream's watcher
 *   ordering, which would have already synced the DOM value).
 *
 * @example
 * const el = useRef<HTMLDivElement>(null)
 * const [color, setColor] = useCssVar('--color', el)
 * setColor('#df8543') // writes style="--color: #df8543" on the element
 */
export declare function useCssVar(
  prop: string | null | undefined,
  target?: RefObject<UseCssVarElement | null>,
  options?: UseCssVarOptions,
): UseCssVarReturn
```
