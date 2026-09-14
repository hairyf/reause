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
 * Map from @vueuse/core `useCssVar`
 * (`source/vueuse/packages/core/useCssVar/`).
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
