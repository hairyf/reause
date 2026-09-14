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

## Type Declarations

```ts
/**
 * Options for `useCssVar`: an optional `initialValue` (also the SSR default — no `document` access
 * happens during render) and an `observe` flag that tracks external changes with a
 * MutationObserver.
 */
export interface UseCssVarOptions extends ConfigurableWindow {
  /**
   * Initial value, also the SSR default — no `document` access happens during render.
   *
   * @default undefined
   */
  initialValue?: string
  /**
   * Use MutationObserver to monitor variable changes. The observer is created from the configured
   * `window`; when that window has no `MutationObserver`, observation is skipped silently.
   *
   * @default false
   */
  observe?: boolean
}
/**
 * Elements accepted as the CSS variable target — a React ref object holding the element.
 */
export type UseCssVarElement = HTMLElement | SVGElement | null | undefined
/**
 * Return of `useCssVar`: a writable `[value, setValue]` tuple (upstream returns a single
 * `ShallowRef`).
 */
export type UseCssVarReturn = [
  value: string | null | undefined,
  setValue: Dispatch<SetStateAction<string | null | undefined>>,
]
/**
 * Map from @vueuse/core `useCssVar`
 * (`source/vueuse/packages/core/useCssVar/`).
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
