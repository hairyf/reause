---
category: '@Integrations'
---

# useChangeCase

Reactive wrapper for [`change-case`](https://github.com/blakeembrey/change-case).

Subsitutes `useCamelCase`, `usePascalCase`, `useSnakeCase`, `useSentenceCase`, `useCapitalize`, etc.

## Install

```bash
npm i change-case@^5
```

## Usage

```tsx
import { useChangeCase } from '@reause/integrations'

// `changeCase` is the transformed value, `setChangeCase` updates the input
const [changeCase, setChangeCase] = useChangeCase('hello world', 'camelCase')
changeCase // helloWorld
setChangeCase('vue use')
changeCase // vueUse
// Supported methods
// export {
//   camelCase,
//   capitalCase,
//   constantCase,
//   dotCase,
//   kebabCase,
//   noCase,
//   pascalCase,
//   pascalSnakeCase,
//   pathCase,
//   sentenceCase,
//   snakeCase,
//   trainCase,
// } from 'change-case'
```

## Type Declarations

```ts
type EndsWithCase<T> = T extends `${infer _}Case` ? T : never
type FilterKeys<T> = {
  [K in keyof T as K extends string ? K : never]: EndsWithCase<K>
}
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
export declare function useChangeCase(
  input: string,
  type: ChangeCaseType,
  options?: Options | undefined,
): UseChangeCaseReturn
```
