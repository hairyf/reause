---
category: Lifecycle
---

# useIsFirstRender

`true` on the very first render of a component instance and `false` on every render after it — a React port of `@mantine/hooks`' `useIsFirstRender` (upstream mapping file: `source/mantine/packages/@mantine/hooks/src/use-is-first-render/use-is-first-render.ts`, 12 LOC; upstream docs [`use-is-first-render`](https://mantine.dev/hooks/use-is-first-render/) — fetched and verified — describe it as "Detects if the component is rendered for the first time").

## Usage

```tsx
import { useIsFirstRender } from '@reause/shared'
import { useEffect } from 'react'

function Query() {
  const isFirstRender = useIsFirstRender()

  useEffect(() => {
    // skip the mount render, then react to every change after it
    if (!isFirstRender)
      refetch()
  }, [deps])
}
```

The returned value is a plain `boolean`, not a ref or a state pair, so it can be read directly during render.

The flag belongs to one component instance, not to the module: two sibling components are each on their own first render, and an unmount followed by a remount starts over with `true`, because the underlying ref is created fresh with the instance.

The ref is read and flipped during the render phase, deliberately, and that is upstream's design rather than an oversight. The value has to be correct in the same render pass that reads it — a consumer that branches on `isFirstRender` inside its own effect needs that effect to be skipped on the mount commit — so deferring the flip to an effect would make the hook one render late for every caller. The write is idempotent per instance, which is what keeps a render-phase write safe here.

Under `<StrictMode>` the mount render reports `false`, not `true` (measured, React 19.2.8). StrictMode double-invokes the mount render and both passes share the same ref, so the first pass observes `true` and flips it, the second pass already reads `false`, and React commits the second pass — the `true` is discarded. This is upstream's behaviour, mirrored on purpose; the hook stays StrictMode-safe (nothing is invented, no state is written during render), but it is not StrictMode-invisible. Production builds, where the render runs once, report `true` correctly. React treats this as inherent to a render-phase flag rather than a bug to fix (facebook/react#24527). If the distinction has to survive StrictMode, gate on a value change instead (`useWhenever`) or hold an explicit ref guard in your own effect.

## Type Declarations

```ts
/**
 * React port of `@mantine/hooks`' `useIsFirstRender`.
 *
 * Map from @mantine/hooks `useIsFirstRender`
 * (`source/mantine/packages/@mantine/hooks/src/use-is-first-render/`) — a direct
 * mirror, not a React-ified variant: mantine is a React library, so AGENTS.md
 * §1.1 mirrors it as-is. The upstream signature and return value are kept
 * exactly (`useIsFirstRender(): boolean`), and upstream exports it as a *named*
 * export — `export function useIsFirstRender()` in the module and
 * `export { useIsFirstRender } from './use-is-first-render/use-is-first-render.js'`
 * in `packages/@mantine/hooks/src/index.ts` — so reause's named export is a
 * 1:1 mirror with no aliasing or default-export shim.
 *
 * Returns `true` on the very first render of a component instance and `false`
 * on every render after that. The flag belongs to one component instance: two
 * instances each see `true` on their own first render, and an unmount followed
 * by a remount starts over with `true`, because the `useRef` is created fresh
 * with the instance.
 *
 * The ref is read and flipped **during the render phase**, and that is kept
 * exactly as upstream wrote it. The flip must land in the same render pass as
 * the read, so that the caller can branch on the result of that pass — the
 * canonical use is `if (!isFirstRender) refetch()` inside an effect, which
 * needs the `true` of the mount render to have been *observed* before anything
 * else can consume it. Deferring the flip to an effect would be too late: the
 * value would only turn `false` a render later, so the mount render's own
 * effect would still read `true` and the hook would be off by one render for
 * every caller. Reading and writing a ref in render is normally discouraged,
 * but this particular flip is idempotent per instance (later renders simply
 * read the already-flipped `false`), which is what makes it safe here.
 *
 * `<StrictMode>` caveat — measured, not assumed, and mirrored deliberately.
 * StrictMode double-invokes the mount render, and **both passes share the same
 * `useRef` object**. The first pass observes `true` and flips the ref; the
 * second pass therefore already reads `false`, and React commits the *second*
 * pass's result. So under `<StrictMode>` the value that actually reaches the
 * committed tree on the mount render is `false`, not `true` — the `true` from
 * the first pass is discarded. The hook is still StrictMode-*safe* (the flip is
 * idempotent, so the second pass is not a spurious "second render", and
 * production builds, where the render runs once, report `true` correctly), but
 * it is not StrictMode-*invisible*: a consumer that branches on the value sees
 * `false` on mount in development. React's position is that this is inherent to
 * a render-phase flag rather than a fixable bug ("There is no progress possible
 * here. This is not a bug." — facebook/react#24527). Making it StrictMode-proof
 * would mean an effect-based mount flag, which would change upstream's design,
 * so this port keeps upstream's. If the distinction must survive StrictMode,
 * gate on a value change instead (`useWhenever`) or hold an explicit ref guard
 * in your own effect.
 *
 * Inside reause, `useUpdateEffect` consumes this hook: its previous private
 * `useFirstMountState` helper was line-for-line the same algorithm (react-use's
 * equivalent, `if (isFirst.current)` over a `useRef(true)` with the same
 * render-phase flip), so the two are behaviourally identical — see that file.
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
export declare function useIsFirstRender(): boolean
```
