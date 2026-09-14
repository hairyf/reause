import { useEffect, useLayoutEffect } from 'react'
import { isClient } from '../utils'

/**
 * React port of react-use's `useIsomorphicLayoutEffect` — `useLayoutEffect` on the client and
 * `useEffect` on the server, so a layout effect can be written once instead of being guarded at
 * every call site against React's "useLayoutEffect does nothing on the server" warning.
 *
 * Map from react-use `useIsomorphicLayoutEffect`
 * (`source/react-use/src/useIsomorphicLayoutEffect.ts`) — a 1:1 mirror of a
 * six-line module. The single documented divergence is the export form: upstream default-exports
 * the value (`export default useIsomorphicLayoutEffect`), while reause exposes it as the named
 * export `useIsomorphicLayoutEffect` (repo convention, the same one every other react-use port here
 * follows). The value itself, the environment check and the branch are mirrored exactly; react-use
 * is mirrored directly, so no signature is adapted (AGENTS.md §1.1).
 *
 * **It is a value, not a wrapper function.** The binding *is* React's own `useLayoutEffect` or
 * `useEffect` — whichever `isClient` selects when the module is evaluated — and not a function that
 * forwards to one of them. That is the drop-in contract the issue asks for:
 * `useIsomorphicLayoutEffect(fn, deps)` at a call site is a call to React's hook itself, so
 * reference identity (`=== useLayoutEffect`) and React's own hook bookkeeping see the real hook
 * rather than one indirection more.
 *
 * The environment check reuses `isClient` from `packages/shared/utils/index.tsx` instead of porting
 * react-use's own `isBrowser` (`source/react-use/src/misc/util.ts`) — reference-chain rule,
 * docs/subagent-execution.md §3.2. One divergence follows from that reuse and is recorded rather
 * than hidden: upstream's `isBrowser` is `typeof window !== 'undefined'`, while `isClient`
 * additionally requires `typeof document !== 'undefined'`. In a realm that defines `window` but no
 * `document` upstream would pick `useLayoutEffect` and this port picks `useEffect`. React's DOM
 * renderer cannot run in such a realm, and in every realm where it can — a document, or a server
 * with neither global — the two checks agree; this port therefore does not claim parity outside
 * those realms.
 *
 * Both React hooks are imported eagerly and the choice is made **once, at module load**. Importing
 * `useLayoutEffect` on the server is harmless; React only warns when it is *invoked* outside a DOM
 * renderer, which is the case the guard removes.
 *
 * @example
 * useIsomorphicLayoutEffect(() => {
 *   // before the browser paints on the client, on the server's passive effect
 *   // timing there
 *   setHeight(boxRef.current?.getBoundingClientRect().height ?? 0)
 * }, [])
 */
export const useIsomorphicLayoutEffect = isClient ? useLayoutEffect : useEffect
