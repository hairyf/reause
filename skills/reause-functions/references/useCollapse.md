---
category: Animation
---

# useCollapse

Animate an element's height between `0` and its measured content height — a four-state machine (`entered` / `entering` / `exiting` / `exited`) plus a `getCollapseProps()` bundle you spread on the collapsible element. Mirrors `@mantine/hooks`' `useCollapse` (upstream mapping files: `source/mantine/packages/@mantine/hooks/src/use-collapse/use-collapse.ts`, 204 LOC, verified against `source/mantine/packages/@mantine/hooks/src/use-collapse/use-collapse.test.tsx`; the co-located `source/mantine/packages/@mantine/hooks/src/use-collapse/use-collapse.story.tsx` is the demo basis). The sibling `use-horizontal-collapse.ts` in that same directory is the width-axis twin and is out of scope for this page.

## Usage

```tsx
import { useCollapse } from '@reause/core'
import { useState } from 'react'

const [expanded, setExpanded] = useState(false)
const { state, getCollapseProps } = useCollapse({ expanded })
```

`state` reports the transition, so drive the toggle from `expanded` while the element handles its own height. Spread the props onto the element that should collapse:

```tsx
<div {...getCollapseProps()}>
  <p>Collapsible content</p>
</div>
```

`getCollapseProps(input?)` is rebuilt every render, so spread it rather than storing it. It returns `{ style, ref, onTransitionEnd, 'aria-hidden', inert }`:

- `style` is `{ boxSizing: 'border-box', ...input.style, ...internalStyles }` — the hook's own transition styles win over `input.style`, which is what lets it drive `height`, `overflow` and `display` while still honouring your border/padding overrides.
- `ref` is merged with `input.ref` (object or callback), so you keep your own handle on the node.
- `onTransitionEnd` is the handler that settles the state machine. Ignore it — by spreading a later `onTransitionEnd` over it, say — and `state` stays in `entering` / `exiting` forever.
- `aria-hidden` and `inert` are both `!expanded`, so collapsed content leaves the accessibility tree and cannot be focused.

`keepMounted` swaps one collapsed style for another, and the pin is narrower than the name suggests: this hook never unmounts the element. With `keepMounted: false` (the default) the collapsed style is `{ height: 0, overflow: 'hidden', display: 'none' }`; with `keepMounted: true` it omits only the `display: 'none'`, leaving `{ height: 0, overflow: 'hidden' }`, so the collapsed box stays laid out. Both branches leave the node in the DOM, and unmounting is the caller's decision — which is why `state` is part of the return value. Upstream's own JSDoc describes the flag as "kept in the DOM and hidden with `display: none`", which is backwards: `display: 'none'` is the branch where the flag is absent. The two branches are covered separately by the tests and can be toggled in the demo.

`getAutoHeightDuration` supplies the transition duration when `transitionDuration` is omitted: `Math.round((4 + 15 * (height / 36) ** 0.25 + (height / 36) / 5) * 10)` on the measured `scrollHeight`, and `0` for a string height — so an unmeasurable element settles with no transition at all rather than over a bogus duration. `getElementHeight(ref)` and `isMeasured(size)` are exported: the first returns `scrollHeight` or `'auto'`, the second is the type guard that decides whether a measurement can be transitioned to (`0` counts as unmeasurable).

The hook writes its style state through `react-dom`'s `flushSync`, so the element is measured and repainted synchronously before the exit transition is applied — that is why collapsing does not jump. Upstream documents the trade-off and this port keeps it: calling `flushSync` outside an event handler, or during a lifecycle method, makes React warn and opts that update out of batching, so the cost is real and deliberate.

`onTransitionStart` and `onTransitionEnd` are read through latest-value refs rather than React 19.2's `useEffectEvent`, so the hook still runs on the declared `react >= 18` peer range (a new callback identity alone never re-triggers a transition, and the render that does fire calls the newest callback — the tests pin both). `useDidUpdate` is built on `@reause/shared`'s `useUpdateEffect`, and `useDidUpdate` plus `mergeRefs` are inlined from mantine's sibling modules; neither is exported.

## Type Declarations

```ts
/**
 * The CSS height to animate an element to: its `scrollHeight`, or the string
 * `'auto'` when the ref holds no element yet. Exported by upstream and kept
 * public here, so a custom implementation can reuse the same measure.
 *
 * Map from @mantine/hooks `getElementHeight`
 * (`source/mantine/packages/@mantine/hooks/src/use-collapse/`, defined in
 * `use-collapse.ts`).
 */
export declare function getElementHeight(
  elementRef: RefObject<HTMLElement | null>,
): number | "auto"
/**
 * Is a measured height a real number we can transition to?
 *
 * Map from @mantine/hooks `isMeasured`
 * (`source/mantine/packages/@mantine/hooks/src/use-collapse/`, defined in
 * `use-collapse.ts`).
 * A type guard, so the `number | string` union narrows to `number` at the call
 * site. `0` is **not** measured — a zero-height element is treated exactly like
 * an unmeasurable one and settles immediately.
 */
export declare function isMeasured(size: number | string): size is number
/** Mixed into `getCollapseProps()` by the caller (a style, an extra `ref`). */
interface GetCollapsePropsInput {
  style?: CSSProperties
  ref?: Ref<HTMLDivElement>
}
/** The props `getCollapseProps()` returns, ready to spread on the element. */
interface GetCollapsePropsReturnValue {
  "aria-hidden": boolean
  inert: boolean
  ref: RefCallback<HTMLDivElement>
  onTransitionEnd: (event: TransitionEvent<Element>) => void
  style: CSSProperties
}
export interface UseCollapseInput {
  /** Expanded state  */
  expanded: boolean
  /** Transition duration in milliseconds, by default calculated based on content height */
  transitionDuration?: number
  /** Transition timing function, `ease` by default */
  transitionTimingFunction?: string
  /** Called when transition ends */
  onTransitionEnd?: () => void
  /** Called when transition starts */
  onTransitionStart?: () => void
  /** If true, collapsed content is kept in the DOM and hidden with `display: none` styles */
  keepMounted?: boolean
}
export type UseCollapseState = "entering" | "entered" | "exiting" | "exited"
export interface UseCollapseReturnValue {
  /** Current transition state */
  state: UseCollapseState
  /** Props to pass down to the collapsible element */
  getCollapseProps: (
    input?: GetCollapsePropsInput,
  ) => GetCollapsePropsReturnValue
}
/**
 * Animate an element's height between `0` and its measured content height.
 *
 * Map from @mantine/hooks `useCollapse`
 * (`source/mantine/packages/@mantine/hooks/src/use-collapse/`) — the whole
 * directory is read, not only its 204-line `use-collapse.ts`:
 * `use-horizontal-collapse.ts` (203 LOC) is the same machine on the width axis,
 * and is deliberately **not** part of this port (follow-up; nothing in this file
 * depends on it, so nothing was inlined from it). The public surface is 1:1:
 * `useCollapse`, the standalone helpers `getElementHeight` / `isMeasured`, and
 * the types `UseCollapseInput` / `UseCollapseState` / `UseCollapseReturnValue`
 * are all exported from `@reause/core`. Upstream additionally declares the
 * `useCollapse` namespace aliases (`useCollapse.Input`, `.ReturnValue`,
 * `.State`); a namespace merge onto an exported function is a lint exception
 * here (`useHotkeys` carries the repo's one disable) and the aliases are
 * redundant with the exported types, so this port omits them. `getAutoHeightDuration`
 * stays private exactly as upstream keeps it.
 *
 * Drive it with a boolean and spread the returned props on the element that
 * should collapse:
 *
 * ```tsx
 * const { state, getCollapseProps } = useCollapse({ expanded })
 *
 * <div {...getCollapseProps()}>
 *   <p>Collapsible content</p>
 * </div>
 * ```
 *
 * **`getCollapseProps(input?)` contract.** It returns a fresh object each
 * render, so spread it rather than holding on to it:
 *
 * - `style` — `{ boxSizing: 'border-box', ...input.style, ...internalStyles }`.
 *   The internal transition styles win over `input.style`, which is what lets
 *   the hook drive `height`, `overflow` and `display` while still honouring your
 *   own border/padding/border-box overrides. `display: 'none'` is part of the
 *   collapsed style unless `keepMounted` is set.
 * - `ref` — merged with `input.ref` (object or callback; see the inlined
 *   `mergeRefs` above) so you can still reach the node yourself.
 * - `onTransitionEnd` — the handler that settles the state machine. Ignore it
 *   (by spreading a later `onTransitionEnd` over it, say) and `state` never
 *   leaves `entering` / `exiting`.
 * - `aria-hidden` / `inert` — both `!expanded`, so collapsed content is out of
 *   the accessibility tree **and** not focusable.
 *
 * **`keepMounted` (two different DOM shapes).** The pin settles what the two
 * branches are, and it is narrower than the name suggests: the element is
 * **never unmounted by this hook** — both branches keep the node in the DOM.
 * `keepMounted: false` (the default) collapses to
 * `{ height: 0, overflow: 'hidden', display: 'none' }`, `keepMounted: true`
 * omits only the `display: 'none'`, leaving `{ height: 0, overflow: 'hidden' }`.
 * So the collapsed *style object* differs (and with it whether the box is laid
 * out at all), and unmounting is the caller's decision — which is why `state`
 * is part of the return value. The two branches are separate code paths and the
 * tests cover them separately. (The docs this port maps from describe it as
 * "kept in the DOM and hidden with `display: none`", which is exactly backwards:
 * `display: 'none'` is the branch where the flag is **absent**.)
 *
 * **`flushSync` (kept deliberately).** The style state is written through
 * `react-dom`'s `flushSync` so the DOM is measured and repainted *synchronously*
 * before the exit transition is applied — that is why the collapse does not
 * jump. Upstream is explicit about the trade-off and so is this port: calling
 * `flushSync` outside an event handler (or during a lifecycle method, which
 * includes a render-phase call site) makes React warn and can be slow, because
 * it opts out of batching. It is load-bearing here, not incidental.
 *
 * **`getAutoHeightDuration`.** When `transitionDuration` is omitted the
 * duration comes from that `height ** 0.25` curve, and is `0` for a string
 * height, so an unmeasurable element settles without a transition at all.
 *
 * **`onTransitionStart` / `onTransitionEnd` freshness (deliberate divergence
 * from upstream's mechanism).** Upstream holds the callbacks in React 19.2's
 * `useEffectEvent`. This port uses latest-value refs instead — the same
 * semantics (the callbacks are read when a transition actually starts or ends,
 * so a new identity alone never re-triggers anything, and the render that does
 * fire calls the newest callback) without taking a hard dependency on a hook
 * that only exists in React 19.2+: `packages/core/package.json` declares
 * `peerDependencies.react: ">=18"`, and `useEffectEvent` is 19.2-only, so
 * mirroring it would make `useCollapse` throw on React 18 while the rest of the
 * barrel keeps working — an undeclared support-floor bump this port cannot make
 * from inside one hook file. The sibling `useHotkeys` port hit the same problem
 * and shipped the same pattern. `useEffectEvent` is **not** load-bearing for
 * any behaviour here: its two uses are callback freshness only, and the tests
 * pin that (identity-only changes fire nothing; the latest callback runs).
 *
 * `useDidUpdate` and `mergeRefs` are inlined from mantine's sibling modules —
 * `useDidUpdate` on top of `@reause/shared`'s `useUpdateEffect` (no third
 * update-only primitive), and `mergeRefs` verbatim because this repo had no
 * equivalent when this port was written (`useMergedRef` / `assignRef` exist in
 * mantine only). Neither is exported.
 *
 * The transition is superseded by a monotonically increasing
 * `transitionRef` id: every frame checks `isCurrentTransition()` first, so a
 * rapid expand→collapse leaves no stale frame to fight the new one, and unmount
 * ends the sequence without calling `onTransitionEnd`.
 *
 * @see https://mantine.dev/hooks/use-collapse/
 *
 * @example
 * const [expanded, setExpanded] = useState(false)
 * const { state, getCollapseProps } = useCollapse({ expanded })
 *
 * <button onClick={() => setExpanded(value => !value)}>
 *   {expanded ? 'Collapse' : 'Expand'}
 *   {' ('}
 *   {state}
 *   {')'}
 * </button>
 * <div {...getCollapseProps()}>
 *   <p>Collapsible content</p>
 * </div>
 */
export declare function useCollapse({
  transitionDuration,
  transitionTimingFunction,
  onTransitionEnd,
  onTransitionStart,
  expanded,
  keepMounted,
}: UseCollapseInput): UseCollapseReturnValue
```
