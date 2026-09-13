---
category: Lifecycle
---

# useIsomorphicLayoutEffect

`useLayoutEffect` on the client, `useEffect` on the server

## Usage

```tsx
import { useIsomorphicLayoutEffect } from '@reause/shared'
import { useRef } from 'react'

const boxRef = useRef<HTMLDivElement>(null)

useIsomorphicLayoutEffect(() => {
  // on the client this runs after the DOM is committed and before the browser
  // paints — a real measurement, in the same frame
  setWidth(boxRef.current?.getBoundingClientRect().width ?? 0)
}, [])
```

The export is a **value, not a wrapper**: the binding _is_ React's own `useLayoutEffect` in the browser and React's own `useEffect` during server-side rendering (`isClient ? useLayoutEffect : useEffect`), chosen once when the module is evaluated — the same shape as upstream's `source/react-use/src/useIsomorphicLayoutEffect.ts`, which is the whole 6-line module. `doSomething`-style forwarding is deliberately not used, so a call site reads exactly like upstream (`useIsomorphicLayoutEffect(effect, deps)`) and reference checks against React's export keep holding. Upstream default-exports the value; reause exposes the same value as the named export `useIsomorphicLayoutEffect`, its only divergence from the pin.

The environment check is reause's `isClient` (`packages/shared/utils/index.tsx`) rather than a port of react-use's `isBrowser` (`source/react-use/src/misc/util.ts`), which is otherwise identical except that `isClient` also requires `document` — in a realm with a `window` but no `document` upstream would still pick `useLayoutEffect` while this port picks `useEffect`; React cannot render into such a realm, and a server has neither global, so both checks agree wherever this hook can actually run. The SSR branch is not observable from the browser test suite: the choice is fixed at module load, so the client arm is what the tests assert and the server arm rests on that same one-line ternary. Upstream's own page (`source/react-use/docs/useIsomorphicLayoutEffect.md`) explains it as "`useLayoutEffect` that does not show warning when server-side rendering" and points at Alex Reardon's article (`https://medium.com/@alexandereardon/uselayouteffect-and-ssr-192986cdcf7a`) — that link was not fetched for this port and is therefore unverified.

## Type Declarations

```ts
/**
 * React port of react-use's `useIsomorphicLayoutEffect` — `useLayoutEffect` on
 * the client and `useEffect` on the server, so a layout effect can be written
 * once instead of being guarded at every call site against React's
 * "useLayoutEffect does nothing on the server" warning.
 *
 * Map from react-use `useIsomorphicLayoutEffect`
 * (`source/react-use/src/useIsomorphicLayoutEffect.ts`) — a 1:1 mirror of a
 * six-line module. The single documented divergence is the export form:
 * upstream default-exports the value (`export default
 * useIsomorphicLayoutEffect`), while reause exposes it as the named export
 * `useIsomorphicLayoutEffect` (repo convention, the same one every other
 * react-use port here follows). The value itself, the environment check and the
 * branch are mirrored exactly; react-use is mirrored directly, so no signature
 * is adapted (AGENTS.md §1.1).
 *
 * **It is a value, not a wrapper function.** The binding *is* React's own
 * `useLayoutEffect` or `useEffect` — whichever `isClient` selects when the
 * module is evaluated — and not a function that forwards to one of them. That
 * is the drop-in contract the issue asks for: `useIsomorphicLayoutEffect(fn,
 * deps)` at a call site is a call to React's hook itself, so reference identity
 * (`=== useLayoutEffect`) and React's own hook bookkeeping see the real hook
 * rather than one indirection more.
 *
 * The environment check reuses `isClient` from
 * `packages/shared/utils/index.tsx` instead of porting react-use's own
 * `isBrowser` (`source/react-use/src/misc/util.ts`) — reference-chain rule,
 * docs/subagent-execution.md §3.2. One divergence follows from that reuse and is
 * recorded rather than hidden: upstream's `isBrowser` is `typeof window !==
 * 'undefined'`, while `isClient` additionally requires `typeof document !==
 * 'undefined'`. In a realm that defines `window` but no `document` upstream
 * would pick `useLayoutEffect` and this port picks `useEffect`. React's DOM
 * renderer cannot run in such a realm, and in every realm where it can — a
 * document, or a server with neither global — the two checks agree; this port
 * therefore does not claim parity outside those realms.
 *
 * Both React hooks are imported eagerly and the choice is made **once, at
 * module load**, exactly as upstream makes it. Importing `useLayoutEffect` on
 * the server is harmless; React only warns when it is *invoked* outside a DOM
 * renderer, which is the case the guard removes.
 *
 * @example
 * useIsomorphicLayoutEffect(() => {
 *   // before the browser paints on the client, on the server's passive effect
 *   // timing there
 *   setHeight(boxRef.current?.getBoundingClientRect().height ?? 0)
 * }, [])
 */
export declare const useIsomorphicLayoutEffect: typeof useEffect
```
