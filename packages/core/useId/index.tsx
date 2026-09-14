import { useIsomorphicLayoutEffect } from '@reause/shared'
import { useId as useReactId, useRef, useState } from 'react'

// Port of `randomId` from `@mantine/hooks`
// (`source/mantine/packages/@mantine/hooks/src/utils/random-id/random-id.ts`) —
// unchanged from upstream, and unexported on purpose: reause ships no equivalent
// helper to reuse and `packages/shared/**` is outside this port's scope.
// The `mantine-` prefix is the same one the pre-mount id carries, so both phases
// have the same shape in markup.
function randomId(prefix = 'mantine-'): string {
  return `${prefix}${Math.random().toString(36).slice(2, 11)}`
}

// `useLayoutEffect` warns when a component renders on the server, so the post-mount swap uses the
// effect variant there — upstream's `useIsomorphicEffect`
// (`source/mantine/packages/@mantine/hooks/src/use-isomorphic-effect/`). That choice is the shared
// `useIsomorphicLayoutEffect` (#923), imported above instead of aliased locally, so the isomorphic
// branch lives in exactly one place (reference-chain rule).

/**
 * React port of `@mantine/hooks`' `useId`.
 *
 * Map from @mantine/hooks `useId`
 * (`source/mantine/packages/@mantine/hooks/src/use-id/use-id.ts`) — a direct
 * mirror, not a React-ified variant: the upstream signature and return value are kept exactly
 * (`useId(staticId?: string): string`), so the hook returns a plain string rather than a tuple or a
 * state pair.
 *
 * **This is not React's `useId`.** React 18+ ships its own `useId`, so the two collide by name;
 * alias this one when a component needs both (`import { useId as useReauseId } from
 * '@reause/core'`). They differ:
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
 * **Two-phase id — the server and the hydration pass agree.** The first render returns
 * `mantine-<reactId>`, derived from React's `useId`, so SSR markup and the client's first
 * (hydration) render compute the same string. Only after mount does the isomorphic effect replace
 * it with `randomId()`. That ordering is the point: a value that differed *before* hydration
 * settled would be a hydration mismatch. `hasInitializedRef` keeps the swap to one shot, so
 * `StrictMode`'s double-invoked effects cannot randomise twice.
 *
 * **`staticId` short-circuits after the hooks, not before them.** The `if (typeof staticId ===
 * 'string') return staticId` sits *after* the effect, so `useId('fixed')` and `useId()` call the
 * same hooks in the same order on every render; a static id still runs the `useReactId` /
 * `useState` / `useRef` / effect chain and simply discards its result. That keeps the hook order
 * stable when the override appears, changes or disappears between renders — React would otherwise
 * throw "Rendered more hooks than during the previous render".
 *
 * On React 19 the react id contains no colons, so upstream's `replace(/:/g, '')` is a no-op there;
 * it is kept verbatim for React 18, whose ids look like `:r0:`.
 *
 * @see https://mantine.dev/hooks/use-id/
 *
 * @example
 * const id = useId() // 'mantine-<react-id>' on the first render, then 'mantine-xxxxxxxxx'
 * const fixed = useId('my-static-id') // always 'my-static-id'
 */
export function useId(staticId?: string): string {
  const reactId = useReactId()
  const [uuid, setUuid] = useState(`mantine-${reactId.replace(/:/g, '')}`)
  const hasInitializedRef = useRef(false)

  useIsomorphicLayoutEffect(() => {
    if (hasInitializedRef.current)
      return
    hasInitializedRef.current = true
    setUuid(randomId())
  }, [])

  if (typeof staticId === 'string')
    return staticId

  return uuid
}
