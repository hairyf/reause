import type { Dispatch, SetStateAction } from 'react'
import type { State } from '../useControllableState'
import { useCallback, useRef, useState } from 'react'
import { toValue } from '../utils'

export type UseStateDefaultReturn<T = any> = [
  /**
   * Current value — the source's current value, or `defaultValue` when the source is
   * `null`/`undefined`.
   */
  value: T,
  /**
   * Setter to update the value (value or updater form, like `setState`) — writes through to a state
   * tuple's setter or a `{ value, onChange }` source's `onChange`.
   */
  setValue: Dispatch<SetStateAction<T | undefined | null>>,
]

/**
 * A state tuple (`[value, setter]`) — mirrors `toValue`'s tuple branch.
 */
function isStateTuple<T>(source: State<T>): source is readonly [T, (value: T | ((prev: T) => T)) => void] {
  return Array.isArray(source) && source.length === 2 && typeof source[1] === 'function'
}

/**
 * A `{ value, onChange }` source — mirrors `toValue`'s object branch (the `addEventListener` guard
 * keeps DOM-ish objects out, like `toValue`).
 */
function isObjectState<T>(source: State<T>): source is { value: T, onChange?: (value: T) => void } {
  return typeof source === 'object' && source !== null && !Array.isArray(source) && 'value' in source && !('addEventListener' in source)
}

/**
 * Apply default value to a state source — React port of VueUse's `refDefault` renamed to
 * `useStateDefault` (this repo's naming for the `ref*` family; upstream's single writable computed
 * ref becomes a tuple).
 *
 * Map from @vueuse/shared `refDefault`
 * Mapping: upstream derives a writable `computed` from a source `Ref<T | undefined | null>` — it
 * reads `source.value ?? defaultValue` and writes back to `source.value`. This port accepts a
 * `State<T | undefined | null>` — a plain value, a getter, a `[value, setter]` tuple or a `{ value,
 * onChange }` pair — and returns the React tuple `const [value, setValue] = useStateDefault(raw,
 * 'default')`. `value` is derived on every render from the source through `toValue` (`source ??
 * defaultValue`), so it always reflects the source's current value — including writes made from
 * outside the component; `setValue` resolves the next value (value or updater form), writes it
 * through to the source (its setter or its `onChange`) and bumps a local version counter so the
 * derived `value` re-renders. SSR-safe: nothing touches the DOM and the first server render already
 * shows the default.
 *
 * @param source       The `State<T | undefined | null>` source holding the
 *                     value — read through `toValue` on every render and
 *                     written back to the tuple setter / `onChange` on
 *                     `setValue`.
 * @param defaultValue The value displayed while the source is `null` or
 *                     `undefined`.
 * @return  A tuple `[value, setValue]` — the current value (source value or
 *          `defaultValue`) and its setter.
 *
 * @example
 * const [raw, setRaw] = useState<string | undefined>(undefined)
 * const [value, setValue] = useStateDefault([raw, setRaw], 'default')
 *
 * setValue('hello')
 * console.log(value) // 'hello' after the next render (React derives at render)
 *
 * setValue(undefined)
 * console.log(value) // 'default' after the next render
 */
export function useStateDefault<T = any>(
  source: State<T | undefined | null>,
  defaultValue: T,
): UseStateDefaultReturn<T> {
  // keep the latest source behind the stable setter — the source object may be
  // swapped between renders (e.g. a fresh `{ current }` on every render)
  const sourceRef = useRef(source)
  sourceRef.current = source

  // local version counter only — `value` itself is derived from `source` on
  // every render (upstream: a computed over the source ref)
  const [, setVersion] = useState(0)
  const bump = () => {
    setVersion(current => current + 1)
  }

  const setValue = useCallback<Dispatch<SetStateAction<T | undefined | null>>>((next) => {
    const current = toValue(sourceRef.current)
    const resolved = typeof next === 'function'
      ? (next as (prev: T | undefined | null) => T | undefined | null)(current)
      : next
    // upstream: `set(value) { source.value = value }` — write through to the
    // source so external readers see the update. `toValue`'s precedence is
    // mirrored here: tuple setter → `{ value, onChange }`; a plain value /
    // getter source stays read-only — no write path exists, so the version
    // bump (re-render) is skipped there too.
    const currentSource = sourceRef.current
    if (isStateTuple(currentSource)) {
      currentSource[1](resolved)
      bump()
    }
    else if (isObjectState(currentSource)) {
      currentSource.onChange?.(resolved)
      bump()
    }
  }, [])

  return [toValue(source) ?? defaultValue, setValue]
}
