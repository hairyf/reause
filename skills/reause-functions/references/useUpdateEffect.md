---
category: Lifecycle
---

# useUpdateEffect

`useEffect` that skips the first render — React port of react-use's [`useUpdateEffect`](https://streamich.github.io/react-use/?path=/story/lifecycle-useupdateeffect--docs), whose upstream implementation lives in `source/react-use/src/useUpdateEffect.ts` and is built on `source/react-use/src/useFirstMountState.ts` (inlined privately by this port).

## Usage

```tsx
import { useUpdateEffect } from '@reause/shared'

useUpdateEffect(() => {
  console.log('count changed, but not on mount')
}, [count])
```

## Type Declarations

```ts
/**
 * React port of react-use's `useUpdateEffect`.
 *
 * Map from react-use `useUpdateEffect`
 * Mapping: `useEffect` that ignores its first invocation (the mount render) and
 * behaves exactly like `useEffect` from then on. Typed as a drop-in for
 * `useEffect` — `(effect: EffectCallback, deps?: DependencyList) => void` — so
 * an existing `useEffect` call can be renamed to `useUpdateEffect` without
 * touching anything else. react-use is mirrored directly (AGENTS.md §1.1) and
 * upstream default-exports the hook; reause exports it as a named export, the
 * convention for these mirrors.
 *
 * `useFirstMountState` — the react-use helper this hook is built on — is now the
 * shared `useIsFirstRender` (#940), imported above instead of inlined. react-use's
 * helper and mantine's `useIsFirstRender` are line-for-line the same algorithm
 * (`if (isFirst.current)` over a `useRef(true)`, flipped during the render phase,
 * returning the same `boolean`), and they were measured to be indistinguishable
 * on every axis that matters here: the value per render pass, the value under
 * `<StrictMode>` (both mount-render passes share the ref, so the committed pass
 * reads `false`), per-instance isolation, and behaviour across unmount/remount.
 * Importing it keeps one copy of the primitive in the package instead of a third;
 * the reference is relative (`../useIsFirstRender`) like every other intra-package
 * import here.
 *
 * That primitive flips its ref during the render phase, and that is kept exactly
 * as upstream wrote it. The flag has to be `false` by the time the *mount*
 * commit's effect runs, so flipping it inside an effect would be too late: that
 * first effect would still observe `true` and skip, and the hook would only start
 * working one render later — which is the whole point of the render-phase flip.
 *
 * StrictMode caveat — upstream's behaviour, mirrored deliberately, development
 * builds only. The flip itself is idempotent per component instance (later
 * renders just read the already flipped `false`), but React's StrictMode
 * double-invokes the *mount render* and both passes share the `useRef`, so the
 * render that actually commits already reads `false`. Inside `<StrictMode>` the
 * hook therefore does NOT skip the mount: the effect fires there, twice, because
 * StrictMode also double-invokes mount effects. A render-phase flip cannot know
 * whether a commit has happened yet, so a render-phase-only skip cannot be made
 * StrictMode-safe; the React team's position is that this is inherent to the
 * pattern rather than a fixable bug — "There is no progress possible here. This
 * is not a bug." (facebook/react#24527). Production builds are unaffected: there
 * the render runs once and the mount is skipped correctly. Making it
 * StrictMode-safe would mean an effect-based mount flag, i.e. changing upstream's
 * design, so this port keeps upstream's. If mount-skipping must survive
 * StrictMode, gate on a value change instead (`useWhenever`) or hold an explicit
 * ref guard in your own effect.
 *
 * @example
 * useUpdateEffect(() => {
 *   console.log('count changed, but not on mount')
 * }, [count])
 */
export declare function useUpdateEffect(
  effect: EffectCallback,
  deps?: DependencyList,
): void
```
