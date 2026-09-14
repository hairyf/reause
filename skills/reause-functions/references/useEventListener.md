---
category: Browser
---

# useEventListener

Use EventListener with ease. Register using [`addEventListener`](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener) on mounted, and [`removeEventListener`](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/removeEventListener) automatically on unmounted

## Usage

```tsx
import { useEventListener } from '@reause/core'

useEventListener(document, 'visibilitychange', (evt) => {
  console.log(evt)
})
```

### Default Target

When the target is omitted, it defaults to `window`:

```tsx
import { useEventListener } from '@reause/core'

// Listens on window
useEventListener('resize', (evt) => {
  console.log(evt)
})
```

### Reactive Target

You can pass a ref as the event target, `useEventListener` will unregister the previous event and register the new one when the target changes:

```tsx
import { useEventListener } from '@reause/core'
import { useRef } from 'react'

const element = useRef<HTMLDivElement>(null)
useEventListener(element, 'keydown', (e) => {
  console.log(e.key)
})
```

### Multiple Events

You can pass an array of events to listen to multiple events at once:

```tsx
useEventListener(document, ['mouseenter', 'mouseleave'], (evt) => {
  console.log(evt.type)
})
```

### Multiple Targets

You can also pass an array of targets:

```tsx
const buttons = document.querySelectorAll('button')
useEventListener(buttons, 'click', (evt) => {
  console.log('Button clicked')
})
```

### Cleanup

Returns a cleanup function to manually unregister the listener:

```tsx
const cleanup = useEventListener(document, 'keydown', (e) => {
  console.log(e.key)
})

cleanup() // This will unregister the listeners.
```

`useEventListener` is SSR-safe: nothing touches `window` during render, and binding happens in the mount effect.

## Type Declarations

```ts
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
export type EventTargetRefs<T> =
  EventTargetRef<T> | RefObject<T[] | null | undefined> | EventTargetRef<T>[]
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
export declare function useEventListener<E extends keyof WindowEventMap>(
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
export declare function useEventListener<E extends keyof WindowEventMap>(
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
export declare function useEventListener<E extends keyof DocumentEventMap>(
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
export declare function useEventListener<E extends keyof ShadowRootEventMap>(
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
export declare function useEventListener<E extends keyof HTMLElementEventMap>(
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
export declare function useEventListener<
  Names extends string,
  EventType = Event,
>(
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
export declare function useEventListener<EventType = Event>(
  target: EventTargetRefs<EventTarget>,
  event: Arrayable<string>,
  listener: Arrayable<GeneralEventListener<EventType>>,
  options?: boolean | AddEventListenerOptions,
): Fn
```
