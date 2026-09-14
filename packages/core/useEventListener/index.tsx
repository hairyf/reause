import type { RefObject } from 'react'
import { isObject, toArray } from '@reause/shared'
import { useCallback, useEffect, useRef, useState } from 'react'

type Arrayable<T> = T | T[]

export type WindowEventName = keyof WindowEventMap
export type DocumentEventName = keyof DocumentEventMap
export type ShadowRootEventName = keyof ShadowRootEventMap

export interface GeneralEventListener<E = Event> {
  (evt: E): void
}

type Fn = () => void

interface InferEventTarget<Events> {
  addEventListener: (event: Events, fn?: any, options?: any) => any
  removeEventListener: (event: Events, fn?: any, options?: any) => any
}

/**
 * A React ref object holding one event target. `undefined` is accepted alongside `null` so a bare
 * `useRef<T>()` is assignable.
 */
export type EventTargetRef<T> = RefObject<T | null | undefined>

/**
 * One or more event targets: a single ref, a ref holding an array of targets, or an array of
 * same-typed refs. Plain targets, getters and callback refs are not accepted — every target is read
 * from its ref's `current`, the same `.current` read `unrefElement` performs for element targets.
 */
export type EventTargetRefs<T> = EventTargetRef<T> | RefObject<T[] | null | undefined> | EventTargetRef<T>[]

/**
 * Resolve the target argument into the flat list of targets to bind: a ref holding an array
 * contributes its members, an array of refs contributes each ref's `current`, and a single ref
 * contributes its `current`.
 */
function resolveTargets<T>(target: EventTargetRefs<T> | undefined): T[] {
  if (target === undefined)
    return []

  const items = Array.isArray(target) ? target : [target]
  const resolved: T[] = []
  for (const item of items) {
    const value = item.current
    if (Array.isArray(value))
      resolved.push(...value.filter((entry): entry is T => entry != null))
    else if (value != null)
      resolved.push(value)
  }
  return resolved
}

function register(
  el: EventTarget,
  event: string,
  listener: any,
  options: boolean | AddEventListenerOptions | undefined,
): () => void {
  el.addEventListener(event, listener, options)
  return () => el.removeEventListener(event, listener, options)
}

function sameValues<T>(a: readonly T[], b: readonly T[]): boolean {
  return a.length === b.length && a.every((value, index) => Object.is(value, b[index]))
}

/**
 * Order-insensitive, identity-aware equality for the resolved options — the React equivalent of
 * upstream's reactive comparison. Key order differences must not re-bind (a `JSON.stringify`
 * comparison would), while identity changes of non-plain values (e.g. a new `AbortSignal`) must.
 */
function sameOptions(
  a: boolean | AddEventListenerOptions | undefined,
  b: boolean | AddEventListenerOptions | undefined,
): boolean {
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null)
    return Object.is(a, b)
  if (!isObject(a) || !isObject(b))
    return Object.is(a, b)
  const aKeys = Object.keys(a).sort()
  const bKeys = Object.keys(b).sort()
  if (!sameValues(aKeys, bKeys))
    return false
  return aKeys.every(key => Object.is((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]))
}

/**
 * Map from @vueuse/core `useEventListener`
 * (`source/vueuse/packages/core/useEventListener/`).
 *
 * @example
 * const root = useRef(document)
 * useEventListener(root, 'visibilitychange', (evt) => {
 *   console.log(evt)
 * })
 *
 * // Listens on window when the target is omitted:
 * useEventListener('resize', (evt) => {
 *   console.log(evt)
 * })
 */
export function useEventListener<E extends keyof WindowEventMap>(
  event: Arrayable<E>,
  listener: Arrayable<(this: Window, ev: WindowEventMap[E]) => any>,
  options?: boolean | AddEventListenerOptions,
): Fn

/**
 * Register using addEventListener on mounted, and removeEventListener automatically on unmounted.
 *
 * Overload 2: Explicitly Window target
 *
 * @see https://vueuse.org/useEventListener
 */
export function useEventListener<E extends keyof WindowEventMap>(
  target: EventTargetRefs<Window>,
  event: Arrayable<E>,
  listener: Arrayable<(this: Window, ev: WindowEventMap[E]) => any>,
  options?: boolean | AddEventListenerOptions,
): Fn

/**
 * Register using addEventListener on mounted, and removeEventListener automatically on unmounted.
 *
 * Overload 3: Explicitly Document target
 *
 * @see https://vueuse.org/useEventListener
 */
export function useEventListener<E extends keyof DocumentEventMap>(
  target: EventTargetRefs<Document>,
  event: Arrayable<E>,
  listener: Arrayable<(this: Document, ev: DocumentEventMap[E]) => any>,
  options?: boolean | AddEventListenerOptions,
): Fn

/**
 * Register using addEventListener on mounted, and removeEventListener automatically on unmounted.
 *
 * Overload 4: Explicitly ShadowRoot target
 *
 * @see https://vueuse.org/useEventListener
 */
export function useEventListener<E extends keyof ShadowRootEventMap>(
  target: EventTargetRefs<ShadowRoot>,
  event: Arrayable<E>,
  listener: Arrayable<(this: ShadowRoot, ev: ShadowRootEventMap[E]) => any>,
  options?: boolean | AddEventListenerOptions,
): Fn

/**
 * Register using addEventListener on mounted, and removeEventListener automatically on unmounted.
 *
 * Overload 5: Explicitly HTMLElement target
 *
 * @see https://vueuse.org/useEventListener
 */
export function useEventListener<E extends keyof HTMLElementEventMap>(
  target: EventTargetRefs<HTMLElement>,
  event: Arrayable<E>,
  listener: Arrayable<GeneralEventListener<HTMLElementEventMap[E]>>,
  options?: boolean | AddEventListenerOptions,
): Fn

/**
 * Register using addEventListener on mounted, and removeEventListener automatically on unmounted.
 *
 * Overload 6: Custom event target with event type infer
 *
 * @see https://vueuse.org/useEventListener
 */
export function useEventListener<Names extends string, EventType = Event>(
  target: EventTargetRefs<InferEventTarget<Names>>,
  event: Arrayable<Names>,
  listener: Arrayable<GeneralEventListener<EventType>>,
  options?: boolean | AddEventListenerOptions,
): Fn

/**
 * Register using addEventListener on mounted, and removeEventListener automatically on unmounted.
 *
 * Overload 7: Custom event target fallback
 *
 * @see https://vueuse.org/useEventListener
 */
export function useEventListener<EventType = Event>(
  target: EventTargetRefs<EventTarget>,
  event: Arrayable<string>,
  listener: Arrayable<GeneralEventListener<EventType>>,
  options?: boolean | AddEventListenerOptions,
): Fn

export function useEventListener(
  ...args: any[]
): Fn {
  // distinguish the two call shapes: a (list of) string event name(s) as the
  // first parameter means the window-target overload, anything else is a target
  const firstArg = args[0]
  const firstIsEventName = typeof firstArg === 'string'
    || (Array.isArray(firstArg) && firstArg.every((entry: unknown) => typeof entry === 'string'))
  const isTargetFirst = !firstIsEventName

  const eventArg = (isTargetFirst ? args[1] : args[0]) as Arrayable<string>
  const listenerArg = (isTargetFirst ? args[2] : args[1]) as Arrayable<GeneralEventListener>
  const optionsArg = (isTargetFirst ? args[3] : args[2]) as boolean | AddEventListenerOptions | undefined

  const win = typeof window === 'undefined' ? undefined : window

  const resolvedTargets: EventTarget[] = isTargetFirst
    ? resolveTargets(args[0] as EventTargetRefs<EventTarget>)
    : (win ? [win] : [])
  const resolvedEvents = toArray(eventArg) as string[]
  const resolvedOptions = optionsArg
  const listenerCount = toArray(listenerArg).length

  // latest raw listener argument, synced each render — the bound dispatcher
  // reads it at dispatch time, so a listener swap needs no re-bind and an
  // inline listener never goes stale
  const listenerRef = useRef(listenerArg)
  listenerRef.current = listenerArg

  // re-bind whenever the resolved targets / events / options change, or the
  // listener count changes (upstream `watchImmediate` over the raw arguments)
  const [bind, setBind] = useState(() => ({
    targets: resolvedTargets,
    events: resolvedEvents,
    options: resolvedOptions,
    listenerCount,
  }))

  if (!sameValues(bind.targets, resolvedTargets)
    || !sameValues(bind.events, resolvedEvents)
    || !sameOptions(bind.options, resolvedOptions)
    || bind.listenerCount !== listenerCount) {
    setBind({
      targets: resolvedTargets,
      events: resolvedEvents,
      options: resolvedOptions,
      listenerCount,
    })
  }

  const cleanupRef = useRef<Fn | null>(null)

  useEffect(() => {
    const { targets, events, options } = bind
    if (!targets.length || !events.length || !toArray(listenerRef.current).length)
      return

    // snapshot options so removal uses the same values as registration
    const optionsClone = isObject(options) ? { ...options } : options

    // one stable dispatcher per target+event that fans out to the latest
    // listeners — registering the listeners themselves would freeze whichever
    // identities were current at bind time (React cannot compare function
    // identities across renders without looping)
    const dispatch = (event: Event) => {
      for (const listener of toArray(listenerRef.current) as GeneralEventListener[])
        (listener as (this: unknown, evt: Event) => void).call(event.currentTarget, event)
    }

    const cleanups = targets.flatMap(el =>
      events.map(event => register(el, event, dispatch, optionsClone)),
    )

    cleanupRef.current = () => cleanups.forEach(fn => fn())

    return () => {
      cleanupRef.current = null
      cleanups.forEach(fn => fn())
    }
  }, [bind])

  // manual cleanup: detaches everything currently registered (upstream `Fn`).
  // The next target / events / options change still re-binds.
  const stop = useCallback(() => {
    cleanupRef.current?.()
    cleanupRef.current = null
  }, [])

  return stop
}
