import type * as FocusTrap from 'focus-trap'
// focus-trap ships an ambient `declare module` d.ts; named type imports from
// it break the tsdown d.ts bundling step (MISSING_EXPORT), so use the
// namespace form — resolves to the same types and emits clean d.ts.
import type { RefObject } from 'react'
import { unrefElement } from '@reause/core'
import { toArray } from '@reause/shared'
import { createFocusTrap } from 'focus-trap'
import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Activate options accepted by `useFocusTrap().activate()` — mirrors focus-trap's non-exported
 * `ActivateOptions`.
 */
type ActivateOptions = NonNullable<Parameters<FocusTrap.FocusTrap['activate']>[0]>

/**
 * Deactivate options accepted by `useFocusTrap().deactivate()` — mirrors focus-trap's non-exported
 * `DeactivateOptions`.
 */
type DeactivateOptions = NonNullable<Parameters<FocusTrap.FocusTrap['deactivate']>[0]>

export interface UseFocusTrapOptions extends FocusTrap.Options {
  /**
   * Immediately activate the trap
   */
  immediate?: boolean

  /**
   * Called when the trap is activated. Focus-trap's own `Options.onActivate` is typed (and, in the
   * pinned version, invoked) without arguments; this port re-declares it with the optional
   * activation params so they are forwarded exactly like upstream (`options.onActivate(params)`).
   */
  onActivate?: (params?: ActivateOptions) => void

  /**
   * Called when the trap is deactivated, receiving the deactivation params. Focus-trap's own
   * `Options.onDeactivate` is typed (and, in the pinned version, invoked) without arguments; this
   * port re-declares it with the optional deactivation params so they are forwarded exactly like
   * upstream (`options.onDeactivate(params)`).
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

/**
 * One item of the focus-trap target list (upstream `MaybeComputedElementRef`, without its getter
 * branch): a selector string or a React ref object holding the element.
 */
type FocusTrapTarget = string | RefObject<MaybeElement>

/**
 * Resolve one target item to a focus-trap container: a selector string, a DOM element, or `null`
 * when it cannot be resolved. Upstream resolves elements with `unrefElement` (`@vueuse/core`); the
 * React port calls the same `unrefElement` (`@reause/core`) on the target ref.
 */
function resolveElement(value: FocusTrapTarget): string | HTMLElement | SVGElement | null {
  if (typeof value === 'string')
    return value

  const el = unrefElement(value)
  if (el instanceof HTMLElement || el instanceof SVGElement)
    return el

  return null
}

/**
 * React port of VueUse's `useFocusTrap` — trap focus within one or more elements.
 *
 * Map from @vueuse/integrations `useFocusTrap`
 * (`source/vueuse/packages/integrations/useFocusTrap/`), a reactive wrapper
 * around the [`focus-trap`](https://github.com/focus-trap/focus-trap) library that keeps focus
 * trapped inside the target element(s) while the trap is active.
 *
 * React divergences: upstream creates the trap inside a `watch` over the resolved targets and
 * exposes `ShallowRef`s for `hasFocus` / `isPaused`. The React port creates the `createFocusTrap`
 * instance in an effect keyed on the resolved targets (mirroring the `watch`), keeps it for the
 * lifetime of the component — target changes go through `updateContainerElements` — and deactivates
 * it on unmount (`tryOnScopeDispose`). `hasFocus` / `isPaused` are plain booleans driven by
 * focus-trap's `onActivate` / `onDeactivate` events plus the pause / unpause calls, and `activate`
 * / `deactivate` / `pause` / `unpause` are stable callbacks delegating to the current trap
 * instance. The `immediate` option activates the trap as soon as the target elements are available.
 *
 * SSR-safe: no `window` or DOM access at module scope — the trap is created lazily inside the
 * effect.
 *
 * @param target - React ref object (`RefObject`) holding the element, a
 *   selector string, or an array of them
 * @param options - focus-trap options (see
 *   https://github.com/focus-trap/focus-trap#createoptions) plus the
 *   `immediate` shortcut
 *
 * @example
 * const target = useRef<HTMLDivElement>(null)
 * const { hasFocus, isPaused, activate, deactivate, pause, unpause } = useFocusTrap(target)
 * activate() // traps focus inside target
 */
export function useFocusTrap(
  target: FocusTrapTarget | FocusTrapTarget[],
  options: UseFocusTrapOptions = {},
): UseFocusTrapReturn {
  const [hasFocus, setHasFocus] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const trapRef = useRef<FocusTrap.FocusTrap | null>(null)

  // Keep the latest target / options for the effect and the stable callbacks
  // (upstream reads both from the composable closure at call time).
  const targetRef = useRef(target)
  targetRef.current = target
  const optionsRef = useRef(options)
  optionsRef.current = options

  // Last resolved targets — upstream: `watch(targets, (els) => {...}, { flush: 'post' })`.
  const resolvedTargetsRef = useRef<(string | HTMLElement | SVGElement)[] | null>(null)

  // Create the trap once the resolved targets are available, then keep its
  // container elements in sync. The effect re-runs after every render (a
  // React ref that is `null` on the first render starts trapping once React
  // attaches the element), but the create/update work only happens when the
  // resolved targets actually changed.
  useEffect(() => {
    const targets = toArray(targetRef.current)
      .map(resolveElement)
      .filter((el): el is string | HTMLElement | SVGElement => el != null)

    const previous = resolvedTargetsRef.current
    resolvedTargetsRef.current = targets
    if (previous && targets.length === previous.length && targets.every((el, index) => el === previous[index]))
      return

    if (!targets.length)
      return

    const trap = trapRef.current

    if (!trap) {
      // create the trap
      const { immediate, ...focusTrapOptions } = optionsRef.current
      trapRef.current = createFocusTrap(targets, {
        ...focusTrapOptions,
        onActivate(params?: ActivateOptions) {
          setHasFocus(true)

          // Apply if user provided onActivate option (upstream forwards params)
          optionsRef.current.onActivate?.(params)
        },
        onDeactivate(params?: DeactivateOptions) {
          setHasFocus(false)

          // Apply if user provided onDeactivate option (upstream forwards params)
          optionsRef.current.onDeactivate?.(params)
        },
      })

      // Focus if immediate is set to true
      if (immediate)
        trapRef.current.activate()
    }
    else {
      // get the active state of the trap
      const isActive = trap.active

      // update the container elements
      trap.updateContainerElements(targets)

      // if the trap is not active and immediate is set to true, activate the trap
      if (!isActive && optionsRef.current.immediate)
        trap.activate()
    }
  })

  // Cleanup on unmount (upstream: `tryOnScopeDispose(() => deactivate())`).
  // Kept as a separate mount-only effect so re-runs of the effect above never
  // tear the trap down.
  useEffect(() => () => {
    trapRef.current?.deactivate()
    trapRef.current = null
  }, [])

  const activate = useCallback((opts?: ActivateOptions) => {
    trapRef.current?.activate(opts)
  }, [])

  const deactivate = useCallback((opts?: DeactivateOptions) => {
    trapRef.current?.deactivate(opts)
  }, [])

  const pause = useCallback(() => {
    if (trapRef.current) {
      trapRef.current.pause()
      setIsPaused(true)
    }
  }, [])

  const unpause = useCallback(() => {
    if (trapRef.current) {
      trapRef.current.unpause()
      setIsPaused(false)
    }
  }, [])

  return {
    hasFocus,
    isPaused,
    activate,
    deactivate,
    pause,
    unpause,
  }
}
