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
