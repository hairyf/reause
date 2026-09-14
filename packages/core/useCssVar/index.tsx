import type { ConfigurableWindow } from '@reause/shared'
import type { Dispatch, RefObject, SetStateAction } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { unrefElement } from '../unrefElement'

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
 * Manipulate CSS variables.
 *
 * Map from @vueuse/core `useCssVar`
 * (`source/vueuse/packages/core/useCssVar/`). Reads the value of a CSS custom
 * property on an element (or on `document.documentElement` when no `target` is given), keeps it in
 * state and writes changes back to the element's inline style. Setting `null`/`undefined` through
 * the setter removes the property.
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
 * - the optional MutationObserver is a self-contained observer inside an effect, disconnected on
 * unmount — like upstream it only updates the state, since the DOM is already the source of the
 * change; it is built from the configured `window` and skipped silently when that window has no
 * `MutationObserver` (upstream's per-window support guard);
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
export function useCssVar(
  prop: string | null | undefined,
  target?: RefObject<UseCssVarElement | null>,
  options: UseCssVarOptions = {},
): UseCssVarReturn {
  const {
    window: customWindow = typeof window === 'undefined' ? undefined : window,
    initialValue,
    observe = false,
  } = options

  const [value, setValue] = useState<string | null | undefined>(initialValue)

  // latest-value refs synced each render so the effects below stay stable and
  // always read the newest prop / target / options (house pattern)
  const propRef = useRef(prop)
  propRef.current = prop
  const targetRef = useRef(target)
  targetRef.current = target
  const initialValueRef = useRef(initialValue)
  initialValueRef.current = initialValue
  const windowRef = useRef(customWindow)
  windowRef.current = customWindow

  // resolve the target element during render so the effects re-run when it
  // changes (upstream: computed `elRef`); falls back to `documentElement`,
  // and stays `undefined` on the server
  const el = (target ? unrefElement(target) : undefined) ?? customWindow?.document?.documentElement
  // resolve the prop value during render so the read/sync effect re-runs when
  // the key changes (a changing key re-reads the variable via the effect)
  const key = prop

  // upstream `updateCssVar`: re-read the variable's current value. Uses a
  // functional setState so the fallback chain `value || variable.value ||
  // initialValue` resolves against the freshest state.
  const updateCssVar = useCallback(() => {
    const rawKey = propRef.current
    const currentEl = (targetRef.current ? unrefElement(targetRef.current) : undefined) ?? windowRef.current?.document?.documentElement
    if (currentEl && windowRef.current && rawKey) {
      const currentValue = windowRef.current.getComputedStyle(currentEl).getPropertyValue(rawKey).trim()
      setValue(previous => currentValue || previous || initialValueRef.current)
    }
  }, [])

  // read/sync effect (upstream: `watch([elRef, () => toValue(prop)], ...)`):
  // when the element or the key changes, remove the previous key from the
  // previous element, then re-read the variable
  const prevTargetRef = useRef<{ el?: UseCssVarElement, key?: string | null | undefined }>({})

  useEffect(() => {
    const prev = prevTargetRef.current
    if (prev.el && prev.key && (prev.el !== el || prev.key !== key))
      prev.el.style.removeProperty(prev.key)
    prevTargetRef.current = { el, key }

    updateCssVar()
  }, [el, key, updateCssVar])

  // write-back effect (upstream: `watch([variable, elRef], ...)`): apply the
  // value to the element's inline style whenever the value or the element
  // changes; `null`/`undefined` removes the property
  const isFirstWriteRef = useRef(true)

  useEffect(() => {
    const rawKey = propRef.current
    if (!el?.style || !rawKey)
      return

    // On the first run a nullish value is the untouched initial state: the
    // read effect (declared above) already synced the DOM value into state,
    // so writing it back would clobber an existing variable. It gets applied
    // by the re-render the read triggered, exactly like upstream's watcher
    // ordering (the read watcher runs before the write watcher).
    if (isFirstWriteRef.current && value == null)
      return
    isFirstWriteRef.current = false

    if (value == null)
      el.style.removeProperty(rawKey)
    else
      el.style.setProperty(rawKey, value)
  }, [value, el])

  // optional MutationObserver (upstream: `useMutationObserver(elRef,
  // updateCssVar, { attributeFilter: ['style', 'class'] })`) — only updates
  // the state, so no write-back loop can occur
  useEffect(() => {
    if (!observe || !el)
      return

    const win = windowRef.current
    // Support is checked on the configured window (upstream:
    // `useSupported(() => window && 'MutationObserver' in window)`), so an env
    // whose window lacks the constructor degrades silently instead of throwing.
    if (!win || !('MutationObserver' in win))
      return

    // The constructor is reached through the resolved window so a custom
    // `window` option can provide its own; the global `MutationObserver` var
    // is not a `Window` member in TS's DOM lib, hence the structural cast.
    const winWithObserver = win as unknown as { MutationObserver: typeof MutationObserver }
    const observer = new winWithObserver.MutationObserver(() => updateCssVar())
    observer.observe(el, { attributeFilter: ['style', 'class'] })

    return () => {
      observer.disconnect()
    }
  }, [observe, el, updateCssVar])

  return [value, setValue]
}
