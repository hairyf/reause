---
category: Utilities
---

# useId

SSR-safe id with an optional static override.

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

## Two-phase id

The first render returns `mantine-<react-id>`, derived from React's own `useId`.
That is the value the server renders _and_ the value the client computes during
hydration, so the two markups always agree. Only after mount does the hook swap
it for a random id (`Math.random().toString(36)` behind the same `mantine-`
prefix). The swap is deliberately deferred past hydration — an id that differed
earlier would be a hydration mismatch — and it happens exactly once, so
`StrictMode`'s double-invoked effects cannot randomise the id twice.

```tsx
const id = useId()
// first render (SSR and hydration): 'mantine-<react-id>'
// after mount:                      'mantine-xxxxxxxxx'
```

## The `staticId` override

Passing a string returns it verbatim and never randomises:

```tsx
const id = useId('my-static-id') // always 'my-static-id'
```

The override is applied _after_ the hook's own hooks have run (the early return
sits after the effect, mirroring upstream), not before them. `useId('fixed')` and
`useId()` therefore call the same hooks in the same order whenever the argument
appears or disappears between renders, which keeps the hook order stable.

## Not React's `useId`

React 18+ ships its own `useId`, so importing this hook shadows it. Alias one of
them when a component needs both:

```tsx
import { useId as useReauseId } from '@reause/core'
import { useId as useReactId } from 'react'
```

They are not interchangeable:

|                 | `useId` from `@reause/core`                                                | `useId` from `react`                         |
| --------------- | -------------------------------------------------------------------------- | -------------------------------------------- |
| Signature       | `useId(staticId?: string): string`                                         | `useId(): string`                            |
| Value over time | `mantine-<react-id>` first, random `mantine-…` after mount                 | stable for the component's lifetime          |
| Static override | yes, returned verbatim                                                     | no                                           |
| Intended for    | ids that must stay unique across separate React roots and plain-HTML nodes | `htmlFor` / `aria-*` pairing inside one tree |

React's `useId` is still the right tool for accessible-label wiring; reach for
this hook only when you need the static override or a value that is unique
outside a single React tree.

## Return Values

- `string` — the static override when one was given, otherwise the two-phase id.

## References

- [Mantine `useId` documentation](https://mantine.dev/hooks/use-id/)

Map from (`source/mantine/packages/@mantine/hooks/src/`):

- `use-id/use-id.ts` — upstream implementation (23 LOC)
- `use-isomorphic-effect/use-isomorphic-effect.ts` — the isomorphic effect the post-mount swap is scheduled in
- `utils/random-id/random-id.ts` — the `randomId()` helper the post-mount id comes from
