/**
 * Map from @vueuse/shared `createEventHook`.
 *
 * @see https://vueuse.org/createEventHook
 *
 * @example
 * const resultEvent = createEventHook<Response>()
 * useListener(resultEvent, (response) => { console.log(response) })
 * resultEvent.trigger(response)
 *
 * `on` returns the `off` function itself — the cleanup is invoked directly
 * (`const off = resultEvent.on(fn); off()`), a deliberate deviation from upstream's `{ off }`
 * object.
 */

// any extends void = true
// so we need to check if T is any first
type IsAny<T> = 0 extends (1 & T) ? true : false

type Callback<T> = IsAny<T> extends true
  ? (...param: any) => void
  : (
      [T] extends [void]
        ? (...param: unknown[]) => void
        : [T] extends [any[]]
            ? (...param: T) => void
            : (...param: [T, ...unknown[]]) => void
    )

export type EventHookOn<T = any> = (fn: Callback<T>) => () => void
export type EventHookOff<T = any> = (fn: Callback<T>) => void
export type EventHookTrigger<T = any> = (...param: Parameters<Callback<T>>) => Promise<unknown[]>

export interface EventHook<T = any> {
  on: EventHookOn<T>
  off: EventHookOff<T>
  trigger: EventHookTrigger<T>
  clear: () => void
}

export type EventHookReturn<T> = EventHook<T>

/**
 * Utility for creating event hooks
 *
 * @see https://vueuse.org/createEventHook
 *
 * @__NO_SIDE_EFFECTS__
 */
export function createEventHook<T = any>(): EventHookReturn<T> {
  const fns: Set<Callback<T>> = new Set()

  const off = (fn: Callback<T>) => {
    fns.delete(fn)
  }

  const clear = () => {
    fns.clear()
  }

  const on = (fn: Callback<T>) => {
    fns.add(fn)

    return () => off(fn)
  }

  const trigger: EventHookTrigger<T> = (...args) => {
    return Promise.all(Array.from(fns).map(fn => fn(...args)))
  }

  return {
    on,
    off,
    trigger,
    clear,
  }
}
