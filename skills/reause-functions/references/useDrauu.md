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
 * Options accepted by `useDrauu` — drauu's own options minus `el`, which the hook supplies from the
 * resolved target (upstream `UseDrauuOptions`).
 */
export type UseDrauuOptions = Omit<Options, "el">
export interface UseDrauuReturn {
  /**
   * The mounted drauu instance — `undefined` until the target resolves to an `<svg>` element
   * (upstream writable `Ref<Drauu | undefined>`). The hook owns the instance lifecycle, so this is
   * a read-only output and has no paired setter (precedent: `useFileSystemAccess`'s `file`,
   * `useTextareaAutosize`'s `textarea`).
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
   * Whether there is an operation to undo (upstream writable `ShallowRef<boolean>`). The hook
   * re-reads it from the instance on every drauu `changed` event, so it is a read-only output and
   * has no paired setter.
   */
  canUndo: boolean
  /**
   * Whether there is an operation to redo (upstream writable `ShallowRef<boolean>`). The hook
   * re-reads it from the instance on every drauu `changed` event, so it is a read-only output and
   * has no paired setter.
   */
  canRedo: boolean
  /**
   * The current brush (upstream writable `Ref<Brush>`) — the hook's only caller-writable value,
   * paired with `setBrush`.
   */
  brush: Brush
  /**
   * React writable-side analog of the upstream `brush` ref, paired with `brush`: `setBrush(next)`
   * or `setBrush(prev => next)` (the React state setter protocol —
   * `Dispatch<SetStateAction<Brush>>`). It writes the returned `brush` value AND the mounted
   * instance's brush / mode.
   */
  setBrush: Dispatch<SetStateAction<Brush>>
  /**
   * Register a listener for drauu's `changed` event — `useListener(onChanged, cb)`.
   */
  onChanged: ListenerOn<() => void>
  /**
   * Register a listener for drauu's `committed` event — `useListener(onCommitted, cb)`. The
   * callback receives the committed `<svg>` node (or `undefined`), matching drauu's `committed`
   * event payload.
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
/**
 * Drauu target (upstream `MaybeComputedElementRef`, without its getter branch): a React ref object
 * holding the element — a plain element, a getter and a callback ref are not accepted.
 */
type DrauuTarget = RefObject<MaybeElement>
/**
 * Map from @vueuse/integrations `useDrauu`
 * (`source/vueuse/packages/integrations/useDrauu/`).
 *
 * @param target - the React ref object holding the target `<svg>` element
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
