export type EventBusListener<T = unknown, P = any> = (event: T, payload?: P) => void
export type EventBusEvents<T, P = any> = Set<EventBusListener<T, P>>

// eslint-disable-next-line unused-imports/no-unused-vars, ts/no-wrapper-object-types
export interface EventBusKey<T> extends Symbol { }

export type EventBusIdentifier<T = unknown> = EventBusKey<T> | string | number

export interface UseEventBusReturn<T, P> {
  /**
   * Subscribe to an event. When calling emit, the listeners will execute.
   * @param listener watch listener.
   * @returns a stop function to remove the current callback.
   */
  on: (listener: EventBusListener<T, P>) => () => void
  /**
   * Similar to `on`, but only fires once
   * @param listener watch listener.
   * @returns a stop function to remove the current callback.
   */
  once: (listener: EventBusListener<T, P>) => () => void
  /**
   * Emit an event, the corresponding event listeners will execute.
   * @param event data sent.
   */
  emit: (event?: T, payload?: P) => void
  /**
   * Remove the corresponding listener.
   * @param listener watch listener.
   */
  off: (listener: EventBusListener<T>) => void
  /**
   * Clear all events
   */
  reset: () => void
}

/**
 * The global event registry — port of upstream `internal.ts`. A single `Map` shared by every bus
 * instance, keyed by the bus identifier. Exported so the mirrored tests can inspect it the same way
 * upstream does via `./internal`.
 */
export const events = new Map<EventBusIdentifier<any>, EventBusEvents<any>>()

/**
 * Map from @vueuse/core `useEventBus`
 * (`source/vueuse/packages/core/useEventBus/`). A basic event bus.
 *
 * This is a pure factory — no React state or effects — so the returned `{ on, once, off, emit,
 * reset }` object mirrors the upstream API 1:1, with listeners stored in the module-level `events`
 * registry above. Any number of `useEventBus(key)` call sites with the same key share the same bus,
 * and `EventBusKey` binds the event type to the key at the type level.
 *
 * React divergences: upstream auto-unsubscribes listeners when the calling effect scope is disposed
 * (`tryOnScopeDispose`). React has no scope disposal, so there is no unmount cleanup; instead `on`
 * / `once` return an unsubscribe function that removes the listener. When a component owns a
 * subscription, call it from a `useEffect` cleanup to avoid leaks.
 *
 * @example
 * const { on, emit, reset } = useEventBus<string>('news')
 * const unsubscribe = on(event => console.log(`news: ${event}`))
 * emit('The Tokyo Olympics has begun')
 * unsubscribe()
 * reset()
 */
export function useEventBus<T = unknown, P = any>(key: EventBusIdentifier<T>): UseEventBusReturn<T, P> {
  function on(listener: EventBusListener<T, P>) {
    const listeners = (events.get(key) || new Set())
    listeners.add(listener)
    events.set(key, listeners)

    const _off = () => off(listener)
    return _off
  }

  function once(listener: EventBusListener<T, P>) {
    function _listener(event: T, payload?: P) {
      off(_listener)
      listener(event, payload)
    }
    return on(_listener)
  }

  function off(listener: EventBusListener<T>): void {
    const listeners = events.get(key)
    if (!listeners)
      return

    listeners.delete(listener)

    if (!listeners.size)
      reset()
  }

  function reset() {
    events.delete(key)
  }

  function emit(event?: T, payload?: P) {
    events.get(key)?.forEach(v => v(event, payload))
  }

  return { on, once, off, emit, reset }
}
