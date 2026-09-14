import type { ListenerOn } from '@reause/shared'
import type { Brush, Drauu, Options } from 'drauu'
import type { Dispatch, RefObject, SetStateAction } from 'react'
import { unrefElement } from '@reause/core'
import { createDrauu } from 'drauu'
import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Options accepted by `useDrauu` — drauu's own options minus `el`, which the hook supplies from the
 * resolved target (upstream `UseDrauuOptions`).
 */
export type UseDrauuOptions = Omit<Options, 'el'>

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
 * Resolve the target ref to a DOM element, or `null` when it cannot be resolved. Upstream resolves
 * elements with `unrefElement` (`@vueuse/core`); the React port calls the same `unrefElement`
 * (`@reause/core`).
 */
function resolveElement(value: DrauuTarget): HTMLElement | SVGElement | null {
  const el = unrefElement(value)
  if (el instanceof HTMLElement || el instanceof SVGElement)
    return el

  return null
}

/** Default brush — upstream's `brush` ref defaults (draw / black / size 3). */
const DEFAULT_BRUSH: Brush = {
  color: 'black',
  size: 3,
  arrowEnd: false,
  cornerRadius: 0,
  dasharray: undefined,
  fill: 'transparent',
  mode: 'draw',
}

interface EventHookRegistrar<T extends (...args: any[]) => void> {
  on: ListenerOn<T>
  trigger: (...args: Parameters<T>) => void
}

/**
 * Minimal event hook — mirrors `@reause/shared`'s `createEventHook` shape (`on` / `trigger`) while
 * staying identity-stable across renders: the listener set lives in a ref, so `on` never changes
 * identity and `useListener(on, cb)` does not re-register on every render. Upstream allocates its
 * `createEventHook()` once per setup; React has no setup phase, so the ref is the equivalent.
 */
function useEventHook<T extends (...args: any[]) => void>(): EventHookRegistrar<T> {
  const fnsRef = useRef(new Set<T>())

  const on = useCallback<ListenerOn<T>>((fn) => {
    fnsRef.current.add(fn)
    return {
      off: () => {
        fnsRef.current.delete(fn)
      },
    }
  }, [])

  const trigger = useCallback((...args: Parameters<T>) => {
    Array.from(fnsRef.current).forEach(fn => fn(...args))
  }, [])

  return { on, trigger }
}

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
export function useDrauu(
  target: DrauuTarget,
  options?: UseDrauuOptions,
): UseDrauuReturn {
  const [drauuInstance, setDrauuInstance] = useState<Drauu | undefined>(undefined)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const [brush, setBrushState] = useState<Brush>(() => ({
    ...DEFAULT_BRUSH,
    ...options?.brush,
  }))

  const instanceRef = useRef<Drauu | null>(null)
  const disposablesRef = useRef<Array<() => void>>([])
  // Last resolved element — upstream's `watch` source; the create / destroy
  // work only happens when this identity changes.
  const elementRef = useRef<SVGSVGElement | null>(null)

  // Latest target / options / brush mirrors — the effect and the stable
  // callbacks always read the current render's values.
  const targetRef = useRef(target)
  targetRef.current = target
  const optionsRef = useRef(options)
  optionsRef.current = options
  const brushRef = useRef(brush)
  brushRef.current = brush

  // Event hooks (upstream `createEventHook<void>()` × 5 — `committed` carries
  // the committed node, `SVGElement | undefined`) — one stable registrar per
  // event; the drauu listeners below trigger them.
  const { on: onChanged, trigger: triggerChanged } = useEventHook<() => void>()
  const { on: onCommitted, trigger: triggerCommitted } = useEventHook<(node: SVGElement | undefined) => void>()
  const { on: onStart, trigger: triggerStart } = useEventHook<() => void>()
  const { on: onEnd, trigger: triggerEnd } = useEventHook<() => void>()
  const { on: onCanceled, trigger: triggerCanceled } = useEventHook<() => void>()

  // upstream `syncStatus()` — re-read the instance's undo / redo availability
  const syncStatus = useCallback(() => {
    const instance = instanceRef.current
    if (!instance)
      return

    setCanUndo(instance.canUndo())
    setCanRedo(instance.canRedo())
  }, [])

  // upstream `cleanup()` — detach drauu's own listeners and unmount
  const destroyInstance = useCallback(() => {
    const instance = instanceRef.current
    if (instance) {
      disposablesRef.current.forEach(dispose => dispose())
      disposablesRef.current = []
      instance.unmount()
      instanceRef.current = null
    }

    setDrauuInstance(undefined)
    setCanUndo(false)
    setCanRedo(false)
  }, [])

  // Create the instance once the target resolves to an `<svg>` element
  // (upstream: `watch(() => unrefElement(target), ...)`). The effect re-runs
  // after every render — a React ref is `null` on the first render and
  // resolves once React attaches the element — but create / destroy only
  // happens when the resolved element identity changed.
  useEffect(() => {
    const el = resolveElement(targetRef.current)
    const svgEl = typeof SVGSVGElement === 'undefined' || !(el instanceof SVGSVGElement) ? null : el

    if (svgEl === elementRef.current)
      return

    elementRef.current = svgEl
    destroyInstance()

    if (!svgEl)
      return

    // `el` comes from the hook; the rest of the user options are forwarded
    // (upstream: `createDrauu({ el, ...options })`) and the merged brush is
    // handed over so the instance starts with the brush we expose.
    const instance = createDrauu({ ...optionsRef.current, el: svgEl, brush: brushRef.current })
    instanceRef.current = instance

    disposablesRef.current = [
      instance.on('canceled', () => triggerCanceled()),
      instance.on('committed', node => triggerCommitted(node)),
      instance.on('start', () => triggerStart()),
      instance.on('end', () => triggerEnd()),
      instance.on('changed', () => {
        syncStatus()
        triggerChanged()
      }),
    ]

    syncStatus()
    setDrauuInstance(instance)
  })

  // Cleanup on unmount (upstream: `tryOnScopeDispose(() => cleanup())`).
  // Kept as a separate mount-only effect so re-runs of the effect above never
  // tear the instance down.
  useEffect(() => () => {
    destroyInstance()
    elementRef.current = null
  }, [destroyInstance])

  // Method callbacks delegate to the current instance and no-op safely while
  // there is none (upstream: `drauuInstance.value?.xxx()`).
  const load = useCallback((svg: string) => {
    instanceRef.current?.load(svg)
  }, [])

  const dump = useCallback(() => instanceRef.current?.dump(), [])

  const clear = useCallback(() => {
    instanceRef.current?.clear()
  }, [])

  const cancel = useCallback(() => {
    instanceRef.current?.cancel()
  }, [])

  const undo = useCallback(() => instanceRef.current?.undo(), [])

  const redo = useCallback(() => instanceRef.current?.redo(), [])

  const setBrush = useCallback((next: SetStateAction<Brush>) => {
    // React setter protocol: a function argument receives the latest brush.
    const value = typeof next === 'function' ? next(brushRef.current) : next
    brushRef.current = value
    setBrushState(value)

    const instance = instanceRef.current
    if (instance) {
      instance.brush = value
      // drauu's `brush` setter does not switch the model; upstream assigns
      // the mode explicitly so the drawing model follows the brush.
      if (value.mode)
        instance.mode = value.mode
    }
  }, [])

  return {
    drauuInstance,

    load,
    dump,
    clear,
    cancel,
    undo,
    redo,
    canUndo,
    canRedo,
    brush,
    setBrush,

    onChanged,
    onCommitted,
    onStart,
    onEnd,
    onCanceled,
  }
}
