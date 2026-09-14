---
category: '@Integrations'
---

# useFocusTrap

Reactive wrapper for [`focus-trap`](https://github.com/focus-trap/focus-trap).

For more information on what options can be passed, see [`createOptions`](https://github.com/focus-trap/focus-trap#createoptions) in the `focus-trap` documentation.

## Install

```bash
npm i focus-trap@^7
```

## Usage

**Basic Usage**

```tsx
import { useFocusTrap } from '@reause/integrations'
import { useRef } from 'react'

function Component() {
  const target = useRef<HTMLDivElement>(null)
  const { hasFocus, activate, deactivate } = useFocusTrap(target)

  return (
    <div>
      <button onClick={() => activate()}>
        Activate
      </button>
      <div ref={target}>
        <span>
          Has Focus:
          {String(hasFocus)}
        </span>
        <input type="text" />
        <button onClick={() => deactivate()}>
          Deactivate
        </button>
      </div>
    </div>
  )
}
```

**Multiple Targets**

```tsx
const targetOne = useRef<HTMLDivElement>(null)
const targetTwo = useRef<HTMLDivElement>(null)
const { hasFocus, activate, deactivate } = useFocusTrap([targetOne, targetTwo])
```

**Selector String**

```tsx
const { hasFocus, activate, deactivate } = useFocusTrap('#dialog')
```

**Automatically Focus**

```tsx
const target = useRef<HTMLDivElement>(null)
const { hasFocus, activate, deactivate } = useFocusTrap(target, { immediate: true })
// the trap is activated as soon as the target element is available
```

**Conditional Rendering**

This function can't properly activate focus on elements with conditional rendering. This is because they do not exist in the DOM at the time of the focus activation. To solve this you need to activate on the next tick.

```tsx
const [show, setShow] = useState(false)
const target = useRef<HTMLDivElement>(null)
const { activate } = useFocusTrap(target, { immediate: true })

function reveal() {
  setShow(true)
  setTimeout(activate, 0)
}
```

## Type Declarations

```ts
/**
 * Activate options accepted by `useFocusTrap().activate()` — mirrors
 * focus-trap's non-exported `ActivateOptions`.
 */
type ActivateOptions = NonNullable<
  Parameters<FocusTrap.FocusTrap["activate"]>[0]
>
/**
 * Deactivate options accepted by `useFocusTrap().deactivate()` — mirrors
 * focus-trap's non-exported `DeactivateOptions`.
 */
type DeactivateOptions = NonNullable<
  Parameters<FocusTrap.FocusTrap["deactivate"]>[0]
>
export interface UseFocusTrapOptions extends FocusTrap.Options {
  /**
   * Immediately activate the trap
   */
  immediate?: boolean
  /**
   * Called when the trap is activated. Focus-trap's own `Options.onActivate` is
   * typed (and, in the pinned version, invoked) without arguments; this port
   * re-declares it with the optional activation params so they are forwarded
   * exactly like upstream (`options.onActivate(params)`).
   */
  onActivate?: (params?: ActivateOptions) => void
  /**
   * Called when the trap is deactivated, receiving the deactivation params.
   * Focus-trap's own `Options.onDeactivate` is typed (and, in the pinned
   * version, invoked) without arguments; this port re-declares it with the
   * optional deactivation params so they are forwarded exactly like upstream
   * (`options.onDeactivate(params)`).
   */
  onDeactivate?: (params?: DeactivateOptions) => void
}
export interface UseFocusTrapReturn {
  /**
   * Indicates if the focus trap is currently active
   */
  hasFocus: boolean
  /**
   * Indicates if the focus trap is currently paused
   */
  isPaused: boolean
  /**
   * Activate the focus trap
   *
   * @see https://github.com/focus-trap/focus-trap#trapactivateactivateoptions
   * @param opts Activate focus trap options
   */
  activate: (opts?: ActivateOptions) => void
  /**
   * Deactivate the focus trap
   *
   * @see https://github.com/focus-trap/focus-trap#trapdeactivatedeactivateoptions
   * @param opts Deactivate focus trap options
   */
  deactivate: (opts?: DeactivateOptions) => void
  /**
   * Pause the focus trap
   *
   * @see https://github.com/focus-trap/focus-trap#trappause
   */
  pause: () => void
  /**
   * Unpauses the focus trap
   *
   * @see https://github.com/focus-trap/focus-trap#trapunpause
   */
  unpause: () => void
}
/** Accepted DOM target kinds — mirrors upstream's `MaybeElement`. */
type MaybeElement = HTMLElement | SVGElement | null | undefined
/** A React ref object holding the element — upstream `MaybeElementRef`. */
interface MaybeElementRef {
  readonly current: MaybeElement
}
/** One item of the focus-trap target list (upstream `MaybeComputedElementRef`, without its getter branch). */
type FocusTrapTarget = string | MaybeElementRef
/**
 * React port of VueUse's `useFocusTrap` — trap focus within one or more
 * elements.
 *
 * Map from @vueuse/integrations `useFocusTrap`
 * (`source/vueuse/packages/integrations/useFocusTrap/`), a reactive wrapper
 * around the [`focus-trap`](https://github.com/focus-trap/focus-trap) library
 * that keeps focus trapped inside the target element(s) while the trap is
 * active.
 *
 * Adjustment for React: upstream creates the trap inside a `watch` over the
 * resolved targets and exposes `ShallowRef`s for `hasFocus` / `isPaused`. The
 * React port creates the `createFocusTrap` instance in an effect keyed on the
 * resolved targets (mirroring the `watch`), keeps it for the lifetime of the
 * component — target changes go through `updateContainerElements` — and
 * deactivates it on unmount (`tryOnScopeDispose`). `hasFocus` / `isPaused`
 * are plain booleans driven by focus-trap's `onActivate` / `onDeactivate`
 * events plus the pause / unpause calls, and `activate` / `deactivate` /
 * `pause` / `unpause` are stable callbacks delegating to the current trap
 * instance. The `immediate` option activates the trap as soon as the target
 * elements are available.
 *
 * SSR-safe: no `window` or DOM access at module scope — the trap is created
 * lazily inside the effect.
 *
 * @param target - element, React ref object (`{ current }`), selector string,
 *   or an array of them
 * @param options - focus-trap options (see
 *   https://github.com/focus-trap/focus-trap#createoptions) plus the
 *   `immediate` shortcut
 *
 * @example
 * const target = useRef<HTMLDivElement>(null)
 * const { hasFocus, isPaused, activate, deactivate, pause, unpause } = useFocusTrap(target)
 * activate() // traps focus inside target
 */
export declare function useFocusTrap(
  target: FocusTrapTarget | FocusTrapTarget[],
  options?: UseFocusTrapOptions,
): UseFocusTrapReturn
```
