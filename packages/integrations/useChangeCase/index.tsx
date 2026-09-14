import type { Options } from 'change-case'
import type { Dispatch, SetStateAction } from 'react'
import * as changeCase from 'change-case'
import { useEffect, useMemo, useRef, useState } from 'react'

type EndsWithCase<T> = T extends `${infer _}Case` ? T : never
type FilterKeys<T> = { [K in keyof T as K extends string ? K : never]: EndsWithCase<K> }
type ChangeCaseKeys = FilterKeys<typeof changeCase>

/**
 * Union of the transformations `change-case` exports as `*Case` functions — derived from the module
 * the same way VueUse does (`noCase`, `camelCase`, `capitalCase`, `constantCase`, `dotCase`,
 * `kebabCase`, `pascalCase`, `pascalSnakeCase`, `pathCase`, `sentenceCase`, `snakeCase`,
 * `trainCase`).
 */
export type ChangeCaseType = ChangeCaseKeys[keyof ChangeCaseKeys]

/**
 * React return type: `[value, setValue]` tuple — the writable-side analog of the upstream
 * `WritableComputedRef<string>` (issue §2B). `value` is the transformed string; `setValue` updates
 * the internal input state.
 */
export type UseChangeCaseReturn = [string, Dispatch<SetStateAction<string>>]

// upstream builds this map dynamically from the module exports; mirrored 1:1
// (name.endsWith('Case') + typeof === 'function')
const changeCaseTransforms = /* @__PURE__ */ Object.entries(changeCase)
  .filter((entry): entry is [string, (input: string, options?: Options) => string] => {
    const [name, fn] = entry
    return typeof fn === 'function' && name.endsWith('Case')
  })
  .reduce((acc, [name, fn]) => {
    acc[name as ChangeCaseType] = fn
    return acc
  }, {} as Record<ChangeCaseType, (input: string, options?: Options) => string>)

/**
 * Map from @vueuse/integrations `useChangeCase`
 * (`source/vueuse/packages/integrations/useChangeCase/`), a reactive wrapper
 * around the `change-case` package. Upstream returns a writable `WritableComputedRef<string>`; here
 * the writable computed ref maps to a `[value, setValue]` tuple: `value` is the transformed string
 * (`change-case` applied to the internal input state with the current `type`), and `setValue`
 * updates that internal input state like a controlled `useState`. `input` is the hook's **read-only
 * value source** and takes a plain `string`; `type` and `options` are plain values (format knobs,
 * upstream `MaybeRefOrGetter`).
 *
 * React divergences:
 * - upstream's writable computed captures a plain `input` once at setup. Here
 *   a changed `input` prop re-syncs the internal state on the next render, so
 *   a parent re-render with a new string is reflected; a `setValue` write is
 *   never clobbered while the `input` prop is unchanged (the baseline records
 *   the last externally synced value);
 * - writes are **not** propagated back to the caller: `setValue` updates the
 *   internal input state only (upstream's writable computed writes through to
 *   a ref input). A changed `input` prop always wins over the internal state;
 * - `setValue` writes the RAW string; the transform is re-applied on the next
 *   render (the upstream computed's `get` re-derives from the ref on access).
 *
 * @__NO_SIDE_EFFECTS__
 * @example
 * const [changeCase, setChangeCase] = useChangeCase('hello world', 'camelCase')
 * changeCase // 'helloWorld'
 * setChangeCase('vue use')
 * changeCase // 'vueUse'
 */
export function useChangeCase(
  input: string,
  type: ChangeCaseType,
  options?: Options | undefined,
): UseChangeCaseReturn {
  // internal input state — the writable half of the upstream computed
  const [text, setText] = useState<string>(input)

  // re-sync when the `input` prop changes between renders (upstream's plain
  // `input` is captured once at setup; React props are the live source). The
  // baseline records the last value synced FROM the prop, so a `setValue` write
  // is only superseded by a genuine prop change
  const lastExternalRef = useRef<string>(input)
  useEffect(() => {
    if (!Object.is(input, lastExternalRef.current)) {
      lastExternalRef.current = input
      setText(input)
    }
  })

  const typeName = type
  const resolvedOptions = options

  const value = useMemo(() => {
    const transform = changeCaseTransforms[typeName]
    if (!transform)
      throw new Error(`Invalid change case type "${typeName}"`)
    return transform(text, resolvedOptions)
  }, [text, typeName, resolvedOptions])

  return [value, setText]
}
