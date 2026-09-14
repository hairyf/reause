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

## Type Declarations

```ts
/**
 * Map from @mantine/hooks `useId`
 * (`source/mantine/packages/@mantine/hooks/src/use-id/use-id.ts`).
 *
 * @see https://mantine.dev/hooks/use-id/
 *
 * @example
 * const id = useId() // 'mantine-<react-id>' on the first render, then 'mantine-xxxxxxxxx'
 * const fixed = useId('my-static-id') // always 'my-static-id'
 */
export declare function useId(staticId?: string): string
```
