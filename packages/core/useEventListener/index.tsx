import type { RefObject } from 'react'
import { isObject, toArray, useUnmount } from '@reause/shared'
import { useCallback, useEffect, useRef } from 'react'

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

  // latest raw listener argument, synced each render — the bound dispatcher
  // reads it at dispatch time, so a listener swap needs no re-bind and an
  // inline listener never goes stale
  const listenerRef = useRef(listenerArg)
  listenerRef.current = listenerArg

  // The binding lives in refs, and the effect below runs after **every** commit
  // — the React equivalent of upstream's `watchImmediate(..., { flush: 'post' })`.
  // A ref target is not reactive in React: React attaches `ref.current` during
  // the commit that follows the render that read the ref, so resolving the
  // targets while rendering sees `null` on mount and only notices the element
  // when some unrelated state change re-renders the component.
  const cleanupRef = useRef<Fn | null>(null)
  const lastBindRef = useRef<{
    targets: EventTarget[]
    events: string[]
    options: boolean | AddEventListenerOptions | undefined
    listenerCount: number
  } | null>(null)

  useEffect(() => {
    const targets = isTargetFirst
      ? resolveTargets(args[0] as EventTargetRefs<EventTarget>)
      : (win ? [win] : [])
    const events = toArray(eventArg) as string[]
    const options = optionsArg
    const listenerCount = toArray(listenerArg).length

    const last = lastBindRef.current
    // an unchanged registration is left exactly as it is — including a target
    // that has not been attached yet. It also keeps a manual `stop()` detached
    // until the target / events / options actually change.
    const unchanged = last !== null
      && sameValues(last.targets, targets)
      && sameValues(last.events, events)
      && sameOptions(last.options, options)
      && last.listenerCount === listenerCount
    if (unchanged)
      return

    // the previous registration is stale: detach it and remember the new args
    cleanupRef.current?.()
    cleanupRef.current = null
    lastBindRef.current = { targets, events, options, listenerCount }

    if (!targets.length || !events.length || !listenerCount)
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
  })

  // unmount-only teardown: the effect above re-runs on every commit, so it
  // cannot own the cleanup itself. Clearing the recorded bind is what makes the
  // pattern remount-safe: React StrictMode (dev) and react-refresh both run
  // mount → cleanup → mount, and without the reset the second mount would find
  // "no argument changed" and leave a registration that was just removed.
  useUnmount(() => {
    cleanupRef.current?.()
    cleanupRef.current = null
    lastBindRef.current = null
  })

  // manual cleanup: detaches everything currently registered (upstream `Fn`).
  // The next target / events / options change still re-binds.
  const stop = useCallback(() => {
    cleanupRef.current?.()
    cleanupRef.current = null
  }, [])

  return stop
}
