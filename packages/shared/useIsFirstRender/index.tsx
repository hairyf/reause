import { useRef } from 'react'

/**
 * React port of `@mantine/hooks`' `useIsFirstRender`.
 *
 * Map from @mantine/hooks `useIsFirstRender`
 * (`source/mantine/packages/@mantine/hooks/src/use-is-first-render/`) — a direct
 * mirror, not a React-ified variant: mantine is a React library, so AGENTS.md §1.1 mirrors it
 * as-is. The upstream signature and return value are kept exactly (`useIsFirstRender(): boolean`),
 * and upstream exports it as a *named* export — `export function useIsFirstRender()` in the module
 * and `export { useIsFirstRender } from './use-is-first-render/use-is-first-render.js'` in
 * `packages/@mantine/hooks/src/index.ts` — so reause's named export is a 1:1 mirror with no
 * aliasing or default-export shim.
 *
 * Returns `true` on the very first render of a component instance and `false` on every render after
 * that. The flag belongs to one component instance: two instances each see `true` on their own
 * first render, and an unmount followed by a remount starts over with `true`, because the `useRef`
 * is created fresh with the instance.
 *
 * The ref is read and flipped **during the render phase**, and that is kept. The flip must land in
 * the same render pass as the read, so that the caller can branch on the result of that pass — the
 * canonical use is `if (!isFirstRender) refetch()` inside an effect, which needs the `true` of the
 * mount render to have been *observed* before anything else can consume it. Deferring the flip to
 * an effect would be too late: the value would only turn `false` a render later, so the mount
 * render's own effect would still read `true` and the hook would be off by one render for every
 * caller. Reading and writing a ref in render is normally discouraged, but this particular flip is
 * idempotent per instance (later renders simply read the already-flipped `false`), which is what
 * makes it safe here.
 *
 * `<StrictMode>` caveat — measured, not assumed, and mirrored deliberately. StrictMode
 * double-invokes the mount render, and **both passes share the same `useRef` object**. The first
 * pass observes `true` and flips the ref; the second pass therefore already reads `false`, and
 * React commits the *second* pass's result. So under `<StrictMode>` the value that actually reaches
 * the committed tree on the mount render is `false`, not `true` — the `true` from the first pass is
 * discarded. The hook is still StrictMode-*safe* (the flip is idempotent, so the second pass is not
 * a spurious "second render", and production builds, where the render runs once, report `true`
 * correctly), but it is not StrictMode-*invisible*: a consumer that branches on the value sees
 * `false` on mount in development. React's position is that this is inherent to a render-phase flag
 * rather than a fixable bug ("There is no progress possible here. This is not a bug." —
 * facebook/react#24527). Making it StrictMode-proof would mean an effect-based mount flag, which
 * would change upstream's design, so this port keeps upstream's. If the distinction must survive
 * StrictMode, gate on a value change instead (`useWhenever`) or hold an explicit ref guard in your
 * own effect.
 *
 * Inside reause, `useUpdateEffect` consumes this hook: its previous private `useFirstMountState`
 * helper was line-for-line the same algorithm (react-use's equivalent, `if (isFirst.current)` over
 * a `useRef(true)` with the same render-phase flip), so the two are behaviourally identical — see
 * that file.
 *
 * @example
 * const isFirstRender = useIsFirstRender()
 *
 * useEffect(() => {
 *   // skip the mount render, then react to every dependency change
 *   if (!isFirstRender)
 *     refetch()
 * }, [deps])
 */
export function useIsFirstRender(): boolean {
  const renderRef = useRef(true)

  if (renderRef.current === true) {
    renderRef.current = false
    return true
  }

  return renderRef.current
}
