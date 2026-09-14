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
 * (`source/vueuse/packages/integrations/useChangeCase/`).
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
