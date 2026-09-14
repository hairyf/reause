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
 * Map from @mantine/hooks `getElementHeight`
 * (`source/mantine/packages/@mantine/hooks/src/use-collapse/`).
 */
export declare function getElementHeight(
  elementRef: RefObject<HTMLElement | null>,
): number | "auto"
/**
 * Map from @mantine/hooks `isMeasured`
 * (`source/mantine/packages/@mantine/hooks/src/use-collapse/`).
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
 * Map from @mantine/hooks `useCollapse`
 * (`source/mantine/packages/@mantine/hooks/src/use-collapse/`).
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
