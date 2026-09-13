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
 * React port of `@mantine/hooks`' `useId`.
 *
 * Map from @mantine/hooks `useId`
 * (`source/mantine/packages/@mantine/hooks/src/use-id/use-id.ts`) — a direct
 * mirror, not a React-ified variant: the upstream signature and return value are
 * kept exactly (`useId(staticId?: string): string`), so the hook returns a plain
 * string rather than a tuple or a state pair.
 *
 * **This is not React's `useId`.** React 18+ ships its own `useId`, so the two
 * collide by name; alias this one when a component needs both
 * (``). They differ:
 *
 * - React's `useId` takes no arguments and never changes after mount; this hook
 *   accepts a `staticId` override and swaps its value once, after mount.
 * - This hook always returns a DOM-friendly `mantine-`-prefixed string, on the
 *   server too; React's id format is an implementation detail (React 19 emits
 *   `_r_*` on the client and `_R_*` on the server, older versions `:r*:`) and is
 *   documented as unsuitable for CSS selectors or list keys.
 * - React's `useId` is the right tool for pairing `htmlFor`/`aria-*` inside one
 *   tree; this one exists for ids that must also stay unique across separate
 *   React roots, hand-written HTML or `document.createElement` nodes — which is
 *   why it randomises itself after mount.
 *
 * **Two-phase id — the server and the hydration pass agree.** The first render
 * returns `mantine-<reactId>`, derived from React's `useId`, so SSR markup and
 * the client's first (hydration) render compute the same string. Only after
 * mount does the isomorphic effect replace it with `randomId()`. That ordering
 * is the point: a value that differed *before* hydration settled would be a
 * hydration mismatch. `hasInitializedRef` keeps the swap to one shot, so
 * `StrictMode`'s double-invoked effects cannot randomise twice.
 *
 * **`staticId` short-circuits after the hooks, not before them.** The
 * `if (typeof staticId === 'string') return staticId` sits *after* the effect, so
 * `useId('fixed')` and `useId()` call the same hooks in the same order on every
 * render; a static id still runs the `useReactId` / `useState` / `useRef` /
 * effect chain and simply discards its result. That keeps the hook order stable
 * when the override appears, changes or disappears between renders — React would
 * otherwise throw "Rendered more hooks than during the previous render".
 *
 * On React 19 the react id contains no colons, so upstream's
 * `replace(/:/g, '')` is a no-op there; it is kept verbatim for React 18, whose
 * ids look like `:r0:`.
 *
 * @see https://mantine.dev/hooks/use-id/
 *
 * @example
 * const id = useId() // 'mantine-<react-id>' on the first render, then 'mantine-xxxxxxxxx'
 * const fixed = useId('my-static-id') // always 'my-static-id'
 */
export declare function useId(staticId?: string): string
```
