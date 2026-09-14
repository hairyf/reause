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

### Value source

`input` is the hook's **read-only value source** and takes a plain `string` (upstream: `MaybeRef<string>`
/ `MaybeRefOrGetter<string>`). A changed `input` prop re-syncs the transformed value on the next render:

```tsx
const [input, setInput] = useState('hello world')
const [changeCase] = useChangeCase(input, 'camelCase')
// setInput('vue use') → changeCase becomes 'vueUse'
```

The returned setter updates the hook's internal input state only — it is **not** propagated back to the
caller (upstream's writable computed writes through to a ref input). A changed `input` prop always wins
over an internal `setValue` write, and an internal write survives a re-render that leaves `input`
unchanged.

`type` and `options` are plain values — they are format knobs, not the hook's value source.

Can be passed into `options` for customization

```tsx
import { useChangeCase } from '@reause/integrations'

const [changeCase] = useChangeCase('helloWorld', 'snakeCase', {
  delimiter: '-',
})
changeCase // hello-world
```

## Type Declarations

```ts
type EndsWithCase<T> = T extends `${infer _}Case` ? T : never
type FilterKeys<T> = {
  [K in keyof T as K extends string ? K : never]: EndsWithCase<K>
}
type ChangeCaseKeys = FilterKeys<typeof changeCase>
/**
 * Union of the transformations `change-case` exports as `*Case` functions —
 * derived from the module the same way VueUse does (`noCase`, `camelCase`,
 * `capitalCase`, `constantCase`, `dotCase`, `kebabCase`, `pascalCase`,
 * `pascalSnakeCase`, `pathCase`, `sentenceCase`, `snakeCase`, `trainCase`).
 */
export type ChangeCaseType = ChangeCaseKeys[keyof ChangeCaseKeys]
/**
 * React return type: `[value, setValue]` tuple — the writable-side analog of
 * the upstream `WritableComputedRef<string>` (issue §2B). `value` is the
 * transformed string; `setValue` updates the internal input state.
 */
export type UseChangeCaseReturn = [string, Dispatch<SetStateAction<string>>]
/**
 * React port of VueUse's `useChangeCase`.
 *
 * Map from @vueuse/integrations `useChangeCase`
 * (`source/vueuse/packages/integrations/useChangeCase/`), a reactive wrapper
 * around the `change-case` package. Upstream returns a writable
 * `WritableComputedRef<string>`; here the writable computed ref maps to a
 * `[value, setValue]` tuple: `value` is the transformed string (`change-case`
 * applied to the internal input state with the current `type`), and
 * `setValue` updates that internal input state like a controlled `useState`.
 * `input` is the hook's **read-only value source** and takes a plain `string`
 * (upstream: `MaybeRef<string>` / `MaybeRefOrGetter<string>`); `type` and
 * `options` are plain values (format knobs, upstream `MaybeRefOrGetter`).
 *
 * Adjustment for React:
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
export declare function useChangeCase(
  input: string,
  type: ChangeCaseType,
  options?: Options | undefined,
): UseChangeCaseReturn
```
