import type {
  CSSProperties,
  Ref,
  RefCallback,
  RefObject,
  SetStateAction,
  TransitionEvent,
} from 'react'
import { useUpdateEffect } from '@reause/shared'
import { useRef, useState } from 'react'
import { flushSync } from 'react-dom'

/**
 * Upstream's duration curve, ported verbatim — the timing is observable, so the formula is not a
 * detail to "clean up".
 *
 * Map from @mantine/hooks `getElementHeight`
 * (`source/mantine/packages/@mantine/hooks/src/use-collapse/`, defined in
 * `use-collapse.ts` and private there, hence private here as well). `Math.round((4 + 15 * (height /
 * 36) ** 0.25 + (height / 36) / 5) * 10)` on the element's measured height, and **`0`** for a
 * non-positive or non-numeric height — the `typeof height === 'string'` half is what makes an
 * unmeasurable element (`getElementHeight` returns the string `'auto'`) settle instantly instead of
 * transitioning over a bogus duration.
 */
function getAutoHeightDuration(height: number | string) {
  if (!height || typeof height === 'string') {
    return 0
  }
  const constant = height / 36
  return Math.round((4 + 15 * constant ** 0.25 + constant / 5) * 10)
}

/**
 * The CSS height to animate an element to: its `scrollHeight`, or the string `'auto'` when the ref
 * holds no element yet. Exported by upstream and kept public here, so a custom implementation can
 * reuse the same measure.
 *
 * Map from @mantine/hooks `getElementHeight`
 * (`source/mantine/packages/@mantine/hooks/src/use-collapse/`, defined in
 * `use-collapse.ts`).
 */
export function getElementHeight(elementRef: RefObject<HTMLElement | null>) {
  return elementRef.current ? elementRef.current.scrollHeight : 'auto'
}

/**
 * Is a measured height a real number we can transition to?
 *
 * Map from @mantine/hooks `isMeasured`
 * (`source/mantine/packages/@mantine/hooks/src/use-collapse/`, defined in
 * `use-collapse.ts`). A type guard, so the `number | string` union narrows to `number` at the call
 * site. `0` is **not** measured — a zero-height element is treated exactly like an unmeasurable one
 * and settles immediately.
 */
export function isMeasured(size: number | string): size is number {
  return typeof size === 'number' && size > 0
}

/**
 * Loose equality over a dependency list — same length, every entry `Object.is`. Upstream's
 * `dependenciesChanged` helper from
 * `source/mantine/packages/@mantine/hooks/src/use-did-update/use-did-update.ts`,
 * inlined privately and used only by `useDidUpdate` below.
 */
function dependenciesChanged(previous: readonly unknown[], next: readonly unknown[]) {
  return (
    previous.length !== next.length
    || next.some((dep, index) => !Object.is(dep, previous[index]))
  )
}

/**
 * Inlined from upstream's `source/mantine/packages/@mantine/hooks/src/use-did-update/` — private on
 * purpose.
 *
 * Built on the sibling `useUpdateEffect` from `@reause/shared`, as this port requires:
 * `useUpdateEffect` already owns the "skip the mount render" half, so this adds only the dependency
 * half rather than a third update-only primitive. Upstream's own `useDidUpdate` is passed here with
 * a dependency list by every mantine hook in this directory, and that is the supported shape.
 *
 * Two behaviours are kept from upstream: a dependency list that did not change (by `Object.is`, per
 * entry) does not run the callback, and with a *changed* list the callback runs with the previous
 * list already recorded.
 *
 * One documented divergence, unreachable from `useCollapse`: upstream lets a callback with **no**
 * dependency list run on every commit, while `useUpdateEffect` forwards no list to React's array
 * identity check, which then never re-runs. Pass a list.
 */
function useDidUpdate(fn: () => void, dependencies?: readonly unknown[]) {
  const previousDependencies = useRef<readonly unknown[] | undefined>(undefined)

  useUpdateEffect(() => {
    const next = dependencies ?? []
    if (previousDependencies.current && !dependenciesChanged(previousDependencies.current, next)) {
      return
    }
    previousDependencies.current = next
    fn()
  }, dependencies as unknown[] | undefined)
}

/**
 * Merge several refs into one callback ref — upstream's
 * `source/mantine/packages/@mantine/hooks/src/use-merged-ref/use-merged-ref.ts`,
 * inlined privately (this repo has no existing `mergeRefs` equivalent; see the hook doc below).
 * Object refs get `current`, function refs get invoked, and the cleanup half is React 19 aware:
 * when any underlying callback ref returns a cleanup, the merged callback returns one too and React
 * calls it instead of calling the refs again with `null`.
 */
function assignRef<T>(ref: Ref<T> | undefined, value: T | null): void | (() => void) {
  if (typeof ref === 'function') {
    return ref(value)
  }
  if (typeof ref === 'object' && ref !== null && 'current' in ref) {
    ref.current = value
  }
}

function mergeRefs<T>(...refs: (Ref<T> | undefined)[]): RefCallback<T> {
  const cleanupMap = new Map<Ref<T> | undefined, () => void>()

  return (node: T | null) => {
    refs.forEach((ref) => {
      const cleanup = assignRef(ref, node)
      if (cleanup) {
        cleanupMap.set(ref, cleanup)
      }
    })

    if (cleanupMap.size > 0) {
      return () => {
        refs.forEach((ref) => {
          const cleanup = cleanupMap.get(ref)
          if (cleanup) {
            cleanup()
          }
          else {
            assignRef(ref, null)
          }
        })
        cleanupMap.clear()
      }
    }
  }
}

/** Mixed into `getCollapseProps()` by the caller (a style, an extra `ref`). */
interface GetCollapsePropsInput {
  style?: CSSProperties
  ref?: Ref<HTMLDivElement>
}

/** The props `getCollapseProps()` returns, ready to spread on the element. */
interface GetCollapsePropsReturnValue {
  'aria-hidden': boolean
  'inert': boolean
  'ref': RefCallback<HTMLDivElement>
  'onTransitionEnd': (event: TransitionEvent<Element>) => void
  'style': CSSProperties
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

export type UseCollapseState = 'entering' | 'entered' | 'exiting' | 'exited'

export interface UseCollapseReturnValue {
  /** Current transition state */
  state: UseCollapseState

  /** Props to pass down to the collapsible element */
  getCollapseProps: (input?: GetCollapsePropsInput) => GetCollapsePropsReturnValue
}

/**
 * Animate an element's height between `0` and its measured content height.
 *
 * Map from @mantine/hooks `useCollapse`
 * (`source/mantine/packages/@mantine/hooks/src/use-collapse/`) — the whole
 * directory is read, not only its 204-line `use-collapse.ts`: `use-horizontal-collapse.ts` (203
 * LOC) is the same machine on the width axis, and is deliberately **not** part of this port
 * (follow-up; nothing in this file depends on it, so nothing was inlined from it). The public
 * surface is 1:1: `useCollapse`, the standalone helpers `getElementHeight` / `isMeasured`, and the
 * types `UseCollapseInput` / `UseCollapseState` / `UseCollapseReturnValue` are all exported from
 * `@reause/core`. Upstream additionally declares the `useCollapse` namespace aliases
 * (`useCollapse.Input`, `.ReturnValue`, `.State`); a namespace merge onto an exported function is a
 * lint exception here (`useHotkeys` carries the repo's one disable) and the aliases are redundant
 * with the exported types, so this port omits them. `getAutoHeightDuration` stays private.
 *
 * Drive it with a boolean and spread the returned props on the element that should collapse:
 *
 * ```tsx
 * const { state, getCollapseProps } = useCollapse({ expanded })
 *
 * <div {...getCollapseProps()}>
 * <p>Collapsible content</p>
 * </div>
 * ```
 *
 * **`getCollapseProps(input?)` contract.** It returns a fresh object each render, so spread it
 * rather than holding on to it:
 *
 * - `style` — `{ boxSizing: 'border-box'...input.style...internalStyles }`. The internal transition
 * styles win over `input.style`, which is what lets the hook drive `height`, `overflow` and
 * `display` while still honouring your own border/padding/border-box overrides. `display: 'none'`
 * is part of the collapsed style unless `keepMounted` is set.
 * - `ref` — merged with `input.ref` (object or callback; see the inlined
 *   `mergeRefs` above) so you can still reach the node yourself.
 * - `onTransitionEnd` — the handler that settles the state machine. Ignore it
 *   (by spreading a later `onTransitionEnd` over it, say) and `state` never
 *   leaves `entering` / `exiting`.
 * - `aria-hidden` / `inert` — both `!expanded`, so collapsed content is out of
 *   the accessibility tree **and** not focusable.
 *
 * **`keepMounted` (two different DOM shapes).** The pin settles what the two branches are, and it
 * is narrower than the name suggests: the element is **never unmounted by this hook** — both
 * branches keep the node in the DOM. `keepMounted: false` (the default) collapses to `{ height: 0,
 * overflow: 'hidden', display: 'none' }`, `keepMounted: true` omits only the `display: 'none'`,
 * leaving `{ height: 0, overflow: 'hidden' }`. So the collapsed *style object* differs (and with it
 * whether the box is laid out at all), and unmounting is the caller's decision — which is why
 * `state` is part of the return value. The two branches are separate code paths and the tests cover
 * them separately. (The docs this port maps from describe it as "kept in the DOM and hidden with
 * `display: none`", which is exactly backwards: `display: 'none'` is the branch where the flag is
 * **absent**.)
 *
 * **`flushSync` (kept deliberately).** The style state is written through `react-dom`'s `flushSync`
 * so the DOM is measured and repainted *synchronously* before the exit transition is applied — that
 * is why the collapse does not jump. Upstream is explicit about the trade-off and so is this port:
 * calling `flushSync` outside an event handler (or during a lifecycle method, which includes a
 * render-phase call site) makes React warn and can be slow, because it opts out of batching. It is
 * load-bearing here, not incidental.
 *
 * **`getAutoHeightDuration`.** When `transitionDuration` is omitted the duration comes from that
 * `height ** 0.25` curve, and is `0` for a string height, so an unmeasurable element settles
 * without a transition at all.
 *
 * **`onTransitionStart` / `onTransitionEnd` freshness (deliberate divergence from upstream's
 * mechanism).** Upstream holds the callbacks in React 19.2's `useEffectEvent`. This port uses
 * latest-value refs instead — the same semantics (the callbacks are read when a transition actually
 * starts or ends, so a new identity alone never re-triggers anything, and the render that does fire
 * calls the newest callback) without taking a hard dependency on a hook that only exists in React
 * 19.2+: `packages/core/package.json` declares `peerDependencies.react: ">=18"`, and
 * `useEffectEvent` is 19.2-only, so mirroring it would make `useCollapse` throw on React 18 while
 * the rest of the barrel keeps working — an undeclared support-floor bump this port cannot make
 * from inside one hook file. The sibling `useHotkeys` port hit the same problem and shipped the
 * same pattern. `useEffectEvent` is **not** load-bearing for any behaviour here: its two uses are
 * callback freshness only, and the tests pin that (identity-only changes fire nothing; the latest
 * callback runs).
 *
 * `useDidUpdate` and `mergeRefs` are inlined from mantine's sibling modules — `useDidUpdate` on top
 * of `@reause/shared`'s `useUpdateEffect` (no third update-only primitive), and `mergeRefs`
 * verbatim because this repo had no equivalent when this port was written (`useMergedRef` /
 * `assignRef` exist in mantine only). Neither is exported.
 *
 * The transition is superseded by a monotonically increasing `transitionRef` id: every frame checks
 * `isCurrentTransition()` first, so a rapid expand→collapse leaves no stale frame to fight the new
 * one, and unmount ends the sequence without calling `onTransitionEnd`.
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
export function useCollapse({
  transitionDuration,
  transitionTimingFunction = 'ease',
  onTransitionEnd,
  onTransitionStart,
  expanded,
  keepMounted,
}: UseCollapseInput): UseCollapseReturnValue {
  const collapsedStyles: CSSProperties = {
    height: 0,
    overflow: 'hidden',
    ...(keepMounted ? {} : { display: 'none' }),
  }

  // latest-value refs synced each render, so a transition frame always calls the
  // newest callback while a mere identity change triggers nothing (the repo's
  // stand-in for upstream's `useEffectEvent` — see the note above)
  const onTransitionStartRef = useRef(onTransitionStart)
  const onTransitionEndRef = useRef(onTransitionEnd)

  onTransitionStartRef.current = onTransitionStart
  onTransitionEndRef.current = onTransitionEnd

  const elementRef = useRef<HTMLElement>(null)
  const [styles, setStylesRaw] = useState<CSSProperties>(expanded ? {} : collapsedStyles)
  const [state, setState] = useState<UseCollapseState>(expanded ? 'entered' : 'exited')
  const setStyles = (newStyles: SetStateAction<CSSProperties>) => {
    flushSync(() => setStylesRaw(newStyles))
  }

  const mergeStyles = (newStyles: CSSProperties) => {
    setStyles(oldStyles => ({ ...oldStyles, ...newStyles }))
  }

  const getTransitionStyles = (height: number | string) => {
    const duration = transitionDuration ?? getAutoHeightDuration(height)
    return {
      transition: `height ${duration}ms ${transitionTimingFunction}, opacity ${duration}ms ${transitionTimingFunction}`,
    }
  }

  const transitionRef = useRef(0)

  useDidUpdate(() => {
    transitionRef.current += 1
    const transitionId = transitionRef.current
    const isCurrentTransition = () => transitionRef.current === transitionId
    const shouldTransition = transitionDuration !== 0

    if (shouldTransition) {
      onTransitionStartRef.current?.()
    }

    if (expanded) {
      window.requestAnimationFrame(() => {
        if (!isCurrentTransition() || !elementRef.current) {
          return
        }

        flushSync(() => setState('entering'))
        mergeStyles({ willChange: 'height', display: 'block', overflow: 'hidden' })
        window.requestAnimationFrame(() => {
          if (!isCurrentTransition() || !elementRef.current) {
            return
          }

          const height = getElementHeight(elementRef)

          if (!isMeasured(height)) {
            setStyles({})
            setState('entered')
            onTransitionEndRef.current?.()
            return
          }

          mergeStyles({ ...getTransitionStyles(height), height })
        })
      })
    }
    else {
      window.requestAnimationFrame(() => {
        if (!isCurrentTransition() || !elementRef.current) {
          return
        }

        flushSync(() => setState('exiting'))
        const height = getElementHeight(elementRef)

        if (!isMeasured(height)) {
          setStyles(collapsedStyles)
          setState('exited')
          onTransitionEndRef.current?.()
          return
        }

        mergeStyles({ ...getTransitionStyles(height), willChange: 'height', height })
        window.requestAnimationFrame(() => {
          if (!isCurrentTransition() || !elementRef.current) {
            return
          }

          mergeStyles({ height: 0, overflow: 'hidden' })
        })
      })
    }
  }, [expanded])

  const handleTransitionEnd = (event: TransitionEvent): void => {
    if (event.target !== elementRef.current || event.propertyName !== 'height') {
      return
    }

    if (expanded) {
      const height = getElementHeight(elementRef)

      if (height === styles.height) {
        setStyles({})
      }
      else {
        mergeStyles({ height })
      }

      setState('entered')
      onTransitionEndRef.current?.()
    }
    else if (styles.height === 0) {
      setStyles(collapsedStyles)
      setState('exited')
      onTransitionEndRef.current?.()
    }
  }

  return {
    state,
    getCollapseProps: input => ({
      'aria-hidden': !expanded,
      'inert': !expanded,
      'ref': mergeRefs(elementRef, input?.ref),
      'onTransitionEnd': handleTransitionEnd,
      'style': { boxSizing: 'border-box', ...input?.style, ...styles },
    }),
  }
}
