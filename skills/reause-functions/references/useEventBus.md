---
category: Utilities
---

# useEventBus

A basic event bus

## Usage

```tsx
import { useEventBus } from '@reause/core'

const bus = useEventBus<string>('news')

function listener(event: string) {
  console.log(`news: ${event}`)
}

// listen to an event
const unsubscribe = bus.on(listener)

// fire an event
bus.emit('The Tokyo Olympics has begun')

// unregister the listener
unsubscribe()
// or
bus.off(listener)

// clearing all listeners
bus.reset()
```

React has no scope disposal, so `on` / `once` return an unsubscribe function; when a component owns a subscription, unsubscribe from a `useEffect` cleanup:

```tsx
import { useEventBus } from '@reause/core'
import { useEffect } from 'react'

function NewsTicker() {
  const { on, emit } = useEventBus<string>('news')

  useEffect(() => on(event => console.log(`news: ${event}`)), [])

  return <button type="button" onClick={() => emit('The Tokyo Olympics has begun')}>Broadcast</button>
}
```

## TypeScript

Using `EventBusKey` is the key to bind the event type to the key, similar to upstream's [`InjectionKey`](https://antfu.me/posts/typed-provide-and-inject-in-vue) util.

```ts
// fooKey.ts
import type { EventBusKey } from '@reause/core'

export const fooKey: EventBusKey<{ name: 'foo' }> = Symbol('symbol-key')
```

```tsx
import { useEventBus } from '@reause/core'

import { fooKey } from './fooKey'

const bus = useEventBus(fooKey)

bus.on((e) => {
  // `e` will be `{ name: 'foo' }`
})
```

## Type Declarations

```ts
export type EventBusListener<T = unknown, P = any> = (
  event: T,
  payload?: P,
) => void
export type EventBusEvents<T, P = any> = Set<EventBusListener<T, P>>
export interface EventBusKey<T> extends Symbol {}
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
export declare const events: Map<
  EventBusIdentifier<any>,
  EventBusEvents<any, any>
>
/**
 * Map from @vueuse/core `useEventBus`
 * (`source/vueuse/packages/core/useEventBus/`).
 *
 * @example
 * const { on, emit, reset } = useEventBus<string>('news')
 * const unsubscribe = on(event => console.log(`news: ${event}`))
 * emit('The Tokyo Olympics has begun')
 * unsubscribe()
 * reset()
 */
export declare function useEventBus<T = unknown, P = any>(
  key: EventBusIdentifier<T>,
): UseEventBusReturn<T, P>
```
