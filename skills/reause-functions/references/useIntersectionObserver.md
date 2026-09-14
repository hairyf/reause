---
category: Elements
---

# useIntersectionObserver

Detects changes to a target element's visibility

## Usage

```tsx
import { useIntersectionObserver } from '@reause/core'
import { useRef, useState } from 'react'

const target = useRef<HTMLDivElement | null>(null)
const [targetIsVisible, setIsVisible] = useState(false)

const { stop } = useIntersectionObserver(
  target,
  ([entry]) => {
    setIsVisible(entry?.isIntersecting || false)
  },
)
```

### Controls and cleanup

`useIntersectionObserver` returns controls for the underlying observer:

| State         | Type         | Description                                                                           |
| ------------- | ------------ | ------------------------------------------------------------------------------------- |
| `isSupported` | `boolean`    | Whether the `IntersectionObserver` API is available.                                  |
| `isActive`    | `boolean`    | Whether the observer is currently running. Turns `false` after `pause()` or `stop()`. |
| `pause`       | `() => void` | Pause observing and set `isActive` to `false`.                                        |
| `resume`      | `() => void` | Resume observing.                                                                     |
| `stop`        | `() => void` | Stop observing permanently.                                                           |

The observer is disconnected automatically on unmount, so in most cases you don't need to call
`stop` yourself. Call `stop()` to disconnect the observer earlier, for example once the element has
become visible:

```ts
const { stop } = useIntersectionObserver(
  target,
  ([entry]) => {
    if (entry?.isIntersecting) {
      // react to the element becoming visible once, then stop observing
      stop()
    }
  },
)
```

[IntersectionObserver MDN](https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver/IntersectionObserver)

## Type Declarations

```ts
/**
 * Options for `useIntersectionObserver`: the platform `IntersectionObserver` options
 * (`root`/`rootMargin`/`threshold`) plus `immediate` and a custom `window` instance, e.g. working
 * with iframes or in testing environments. The accepted target types
 * (`TargetElement`/`ElementTarget`/ `ElementTargetOrArray`) are shared with `useResizeObserver`.
 */
export interface UseIntersectionObserverOptions {
  /**
   * Custom `window` instance, e.g. working with iframes or in testing environments. Unlike
   * `ConfigurableWindow`, an explicit `null` is honored as-is: it disables observation entirely
   * (mirroring upstream's `window && 'IntersectionObserver' in window` support gate) — only an
   * omitted option falls back to the global `window`.
   */
  window?: Window | null
  /**
   * Start the IntersectionObserver immediately on creation.
   *
   * @default true
   */
  immediate?: boolean
  /**
   * The Element or Document whose bounds are used as the bounding box when testing for
   * intersection.
   */
  root?: ElementTarget | RefObject<Document | null>
  /**
   * A string which specifies a set of offsets to add to the root's bounding_box when calculating
   * intersections.
   */
  rootMargin?: string
  /**
   * Either a single number or an array of numbers between 0.0 and 1.
   * @default 0
   */
  threshold?: number | number[]
}
/**
 * Return of `useIntersectionObserver`, mirroring upstream's `Supportable & Pausable` shape: `{
 * isSupported, isActive, pause, resume, stop }`.
 */
export interface UseIntersectionObserverReturn {
  /**
   * Whether the current environment supports the `IntersectionObserver` API. Starts `false` and
   * settles in a mount effect (SSR-safe).
   */
  isSupported: boolean
  /**
   * Whether the observer is currently running. Starts from the `immediate` option (default `true`)
   * and turns `false` after `pause()` or `stop()`.
   */
  isActive: boolean
  /**
   * Pause observing and set `isActive` to `false`.
   */
  pause: () => void
  /**
   * Resume observing.
   */
  resume: () => void
  /**
   * Disconnect the observer and stop observing permanently. Calling it again is a no-op — the hook
   * does not restart after `stop()`.
   */
  stop: () => void
}
/**
 * Map from @vueuse/core `useIntersectionObserver`
 * (`source/vueuse/packages/core/useIntersectionObserver/`).
 *
 * @example
 * const target = useRef<HTMLDivElement | null>(null)
 * const [targetIsVisible, setIsVisible] = useState(false)
 *
 * useIntersectionObserver(target, ([entry]) => {
 *   setIsVisible(entry?.isIntersecting || false)
 * })
 */
export declare function useIntersectionObserver(
  target: ElementTargetOrArray,
  callback: IntersectionObserverCallback,
  options?: UseIntersectionObserverOptions,
): UseIntersectionObserverReturn
```
