---
category: Sensors
---

# useScrollLock

Lock scrolling of the element

## Usage

```tsx
import { useScrollLock } from '@reause/core'
import { useRef } from 'react'

const el = useRef<HTMLDivElement>(null)
const [isLocked, setIsLocked] = useScrollLock(el)

setIsLocked(true) // lock
setIsLocked(false) // unlock
```

## Type Declarations

```ts
/**
 * An element (or `Window` / `Document`) whose scrolling can be locked,
 * including `null` / `undefined` while it is not available yet.
 */
export type ScrollLockElement =
  HTMLElement | SVGElement | Window | Document | null | undefined
/**
 * The scroll-lock target: a plain element (or `Window` / `Document`) or a
 * React ref holding one — the React equivalent of upstream's
 * `MaybeRefOrGetter<HTMLElement | SVGElement | Window | Document | null | undefined>`.
 */
export type ScrollLockTarget = ScrollLockElement | Ref<ScrollLockElement>
/**
 * Return of `useScrollLock`: the current lock state and its setter —
 * `setIsLocked(true)` locks the element, `setIsLocked(false)` unlocks it
 * (the React form of upstream's writable `computed` return).
 */
export type UseScrollLockReturn = [
  isLocked: boolean,
  setIsLocked: (value: boolean) => void,
]
/**
 * React port of VueUse's `useScrollLock`.
 *
 * Map from @vueuse/core `useScrollLock`
 * (`source/vueuse/packages/core/useScrollLock/`). Locks scrolling of the
 * element by toggling its inline `overflow` style. Upstream's
 * `_resolve-element` target resolution and the iOS `touchmove` fallback
 * helpers (`checkOverflowScroll` / `preventDefault`) are inlined into this
 * single file per the issue #206 mapping (reause keeps one file per hook);
 * the upstream `vScrollLock` directive variant has no React equivalent and is
 * not ported.
 *
 * React divergences:
 *
 * - upstream returns a writable `computed` (`isLocked.value = true/false`);
 *   React gets the `[isLocked, setIsLocked]` tuple — `setIsLocked(true)`
 *   locks, `setIsLocked(false)` unlocks, mirroring the computed setter. The
 *   setter is stable, and the internal lock flag updates synchronously so
 *   repeated calls in one tick behave like upstream's sync ref.
 * - the element is accepted as a plain element (or `Window` / `Document`) or
 *   a ref-like `{ current }` object, and is re-resolved when `lock` /
 *   `unlock` run and when the sync / cleanup effects run, so a ref attached
 *   after the first render is locked and unlocked exactly as upstream does
 *   (upstream re-resolves `toValue(element)` inside `lock`/`unlock`). A
 *   function target is the `RefCallback` arm of `Ref<T>` and cannot be read
 *   synchronously, so it resolves to no element. Mutating a ref-like
 *   `.current` while locked does not re-sync the DOM without a re-render —
 *   re-render for the sync effect to run again, mirroring upstream's `watch`
 *   re-firing on ref change.
 * - the immediate `watch(element, …)` sync becomes an effect keyed on the
 *   render-time resolved element identity that re-resolves the target when it
 *   runs (commit time): it records the element's initial overflow, adopts an
 *   already-`hidden` element as locked (external CSS or another hook
 *   instance), and applies `hidden` while locked.
 * - `tryOnScopeDispose(unlock)` becomes an unmount cleanup restoring the
 *   element's initial overflow. The state flip is skipped in the cleanup on
 *   purpose: it is unobservable after a real unmount, and keeping the
 *   internal lock flag intact lets React StrictMode's effect remount
 *   re-apply the lock through the sync effect.
 * - the initial-overflow cache is a module-level `WeakMap` shared by all
 *   hook instances pointing at the same element (upstream behavior): with
 *   two hooks on one element, the second `unlock` restores the shared
 *   initial overflow while the first instance still reports locked.
 * - swapping to a different element does not restore the previous element's
 *   overflow (upstream `watch` behavior) — the new element is synced instead.
 *
 * @example
 * const el = useRef<HTMLDivElement>(null)
 * const [isLocked, setIsLocked] = useScrollLock(el)
 *
 * setIsLocked(true) // lock
 * setIsLocked(false) // unlock
 */
export declare function useScrollLock(
  element: ScrollLockTarget,
  initialState?: boolean,
): UseScrollLockReturn
```
