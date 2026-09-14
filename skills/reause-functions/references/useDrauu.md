---
category: '@Integrations'
---

# useDrauu

Reactive instance for [drauu](https://github.com/antfu/drauu).

## Install

```bash
npm i drauu@^1
```

## Usage

```tsx
import { useDrauu } from '@reause/integrations'
import { useRef } from 'react'

const target = useRef<SVGSVGElement>(null)
const { undo, redo, canUndo, canRedo, clear, brush, setBrush } = useDrauu(target, {
  brush: { color: 'black', size: 3 },
})

// `brush` is the current brush value; `setBrush` is its paired setter and
// updates both the returned value and the mounted instance
setBrush(prev => ({ ...prev, color: '#ef4444' }))

return <svg ref={target} />
```

## Type Declarations

```ts
/**
 * Options accepted by `useDrauu` — drauu's own options minus `el`, which the
 * hook supplies from the resolved target (upstream `UseDrauuOptions`).
 */
export type UseDrauuOptions = Omit<Options, "el">
export interface UseDrauuReturn {
  /**
   * The mounted drauu instance — `undefined` until the target resolves to an
   * `<svg>` element (upstream writable `Ref<Drauu | undefined>`). The hook owns
   * the instance lifecycle, so this is a read-only output and has no paired
   * setter (precedent: `useFileSystemAccess`'s `file`, `useTextareaAutosize`'s
   * `textarea`).
   */
  drauuInstance: Drauu | undefined
  /**
   * Load an SVG string into the instance (upstream `Ref<Drauu>.load`).
   */
  load: (svg: string) => void
  /**
   * Serialize the current canvas as an SVG string.
   */
  dump: () => string | undefined
  /**
   * Clear the canvas and the operation stack.
   */
  clear: () => void
  /**
   * Cancel the stroke in progress.
   */
  cancel: () => void
  /**
   * Undo the last operation — `undefined` when there is no instance.
   */
  undo: () => boolean | undefined
  /**
   * Redo the last undone operation — `undefined` when there is no instance.
   */
  redo: () => boolean | undefined
  /**
   * Whether there is an operation to undo (upstream writable
   * `ShallowRef<boolean>`). The hook re-reads it from the instance on every
   * drauu `changed` event, so it is a read-only output and has no paired setter.
   */
  canUndo: boolean
  /**
   * Whether there is an operation to redo (upstream writable
   * `ShallowRef<boolean>`). The hook re-reads it from the instance on every
   * drauu `changed` event, so it is a read-only output and has no paired setter.
   */
  canRedo: boolean
  /**
   * The current brush (upstream writable `Ref<Brush>`) — the hook's only
   * caller-writable value, paired with `setBrush`.
   */
  brush: Brush
  /**
   * React writable-side analog of the upstream `brush` ref, paired with
   * `brush`: `setBrush(next)` or `setBrush(prev => next)` (the React state
   * setter protocol — `Dispatch<SetStateAction<Brush>>`). It writes the
   * returned `brush` value AND the mounted instance's brush / mode.
   */
  setBrush: Dispatch<SetStateAction<Brush>>
  /**
   * Register a listener for drauu's `changed` event — `useListener(onChanged, cb)`.
   */
  onChanged: ListenerOn<() => void>
  /**
   * Register a listener for drauu's `committed` event — `useListener(onCommitted, cb)`.
   * The callback receives the committed `<svg>` node (or `undefined`), matching
   * drauu's `committed` event payload.
   */
  onCommitted: ListenerOn<(node: SVGElement | undefined) => void>
  /**
   * Register a listener for drauu's `start` event — `useListener(onStart, cb)`.
   */
  onStart: ListenerOn<() => void>
  /**
   * Register a listener for drauu's `end` event — `useListener(onEnd, cb)`.
   */
  onEnd: ListenerOn<() => void>
  /**
   * Register a listener for drauu's `canceled` event — `useListener(onCanceled, cb)`.
   */
  onCanceled: ListenerOn<() => void>
}
/** Accepted DOM target kinds — mirrors upstream's `MaybeElement`. */
type MaybeElement = HTMLElement | SVGElement | null | undefined
/** A React ref object holding the element — upstream `MaybeElementRef`. */
interface MaybeElementRef {
  readonly current: MaybeElement
}
/** Drauu target (upstream `MaybeComputedElementRef`, without its getter branch). */
type DrauuTarget = MaybeElementRef
/**
 * React port of VueUse's `useDrauu` — reactive instance for
 * [drauu](https://github.com/antfu/drauu).
 *
 * Map from @vueuse/integrations `useDrauu`
 * (`source/vueuse/packages/integrations/useDrauu/`), which creates a drauu
 * instance for an `<svg>` element and exposes the drawing API plus its events.
 * Upstream has no test file — the co-located `useDrauu.test.tsx` is authored
 * for this port.
 *
 * Adjustment for React (upstream returns `Ref` / `ShallowRef` / `EventHookOn`):
 * - the return is an OBJECT with a paired setter for every caller-writable
 *   value (return-shape rule 5). `brush` is the only such value — upstream's
 *   writable `Ref<Brush>` — and it is paired with `setBrush`, the React state
 *   setter (`Dispatch<SetStateAction<Brush>>`), so `setBrush(next)` and
 *   `setBrush(prev => next)` both work; `setBrush` writes the state AND the
 *   mounted instance's brush / mode, mirroring upstream's deep watcher;
 * - `drauuInstance`, `canUndo` and `canRedo` are plain values from state
 *   instead of refs and stay read-only outputs without paired setters: the
 *   hook owns the instance lifecycle and re-reads the undo / redo status from
 *   the instance on every drauu `changed` event, so a caller write would be
 *   overwritten (upstream returns them as writable `Ref` / `ShallowRef`s;
 *   precedent: `useFileSystemAccess`'s `file`, `useAsyncState`'s `isReady` /
 *   `error`, `useTextareaAutosize`'s `textarea`);
 * - the five `on*` members are §2D registrars — `(fn) => ({ off })` typed
 *   `ListenerOn<T>` (`@reause/shared`), consumable as
 *   `useListener(onChanged, cb)` for automatic cleanup on unmount, and `off()`
 *   removes exactly that listener and is idempotent;
 * - the instance is created in an effect keyed on the resolved element's
 *   identity (upstream: `watch(() => unrefElement(target), ..., { flush: 'post' })`)
 *   and unmounted on cleanup (`tryOnScopeDispose`); an element-identity change
 *   destroys and recreates the instance. **Divergence:** resolving to `null` —
 *   a React ref whose element left the tree — destroys the instance and frees
 *   drauu's window listeners, where upstream keeps the last instance alive
 *   until scope dispose. Destroying is deliberate in React: a `null` ref means
 *   the element is gone, and a stale live instance would keep drawing on a
 *   detached `<svg>`; the co-located test pins this behavior;
 * - the element is resolved locally from `@reause/shared`'s `toValue` /
 *   `isRefLike` (precedent: `useFocusTrap.ts`), never from `@reause/core` —
 *   `packages/integrations` must not depend on core (eslint
 *   `no-restricted-imports`). Only an `SVGSVGElement` target mounts, matching
 *   upstream's guard.
 *
 * @param target - the target `<svg>` element or a React ref-like object (`{ current }`)
 * @param options - drauu options (`Omit<Options, 'el'>`); `brush` is merged over the defaults
 *
 * @__NO_SIDE_EFFECTS__
 * @example
 * const target = useRef<SVGSVGElement>(null)
 * const { undo, redo, canUndo, canRedo, brush, setBrush } = useDrauu(target)
 * setBrush(prev => ({ ...prev, color: '#ef4444' }))
 * return <svg ref={target} />
 */
export declare function useDrauu(
  target: DrauuTarget,
  options?: UseDrauuOptions,
): UseDrauuReturn
```
