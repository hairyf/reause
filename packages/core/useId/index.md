---
category: Utilities
---

# useId

SSR-safe id with an optional static override — React port of `@mantine/hooks`' `useId` (upstream mapping files: `source/mantine/packages/@mantine/hooks/src/use-id/use-id.ts`, 23 LOC, `use-isomorphic-effect/use-isomorphic-effect.ts` and `utils/random-id/random-id.ts`).

## Usage

```tsx
import { useId } from '@reause/core'

function Field() {
  const id = useId()

  return <input id={id} />
}
```

Pass a string to pin the id instead of generating one:

```tsx
import { useId } from '@reause/core'

const fixedId = useId('my-static-id') // always 'my-static-id'
```

React ships a hook with the same name, so alias this one when a component needs both: `import { useId as useReauseId } from '@reause/core'` alongside `import { useId as useReactId } from 'react'`.
