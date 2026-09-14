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
