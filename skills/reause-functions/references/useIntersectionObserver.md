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
 * Options for `useIntersectionObserver`: the platform `IntersectionObserver`
 * options (`root`/`rootMargin`/`threshold`) plus `immediate` and a custom
 * `window` instance, e.g. working with iframes or in testing environments.
 * The accepted target types (`TargetElement`/`ElementTarget`/
 * `ElementTargetOrArray`) are shared with `useResizeObserver`.
 */
export interface UseIntersectionObserverOptions {
  /**
   * Custom `window` instance, e.g. working with iframes or in testing
   * environments. Unlike `ConfigurableWindow`, an explicit `null` is honored
   * as-is: it disables observation entirely (mirroring upstream's
   * `window && 'IntersectionObserver' in window` support gate) — only an
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
   * The Element or Document whose bounds are used as the bounding box when testing for intersection.
   */
  root?: ElementTarget | RefObject<Document | null>
  /**
   * A string which specifies a set of offsets to add to the root's bounding_box when calculating intersections.
   */
  rootMargin?: string
  /**
   * Either a single number or an array of numbers between 0.0 and 1.
   * @default 0
   */
  threshold?: number | number[]
}
/**
 * Return of `useIntersectionObserver`, mirroring upstream's `Supportable &
 * Pausable` shape: `{ isSupported, isActive, pause, resume, stop }`.
 */
export interface UseIntersectionObserverReturn {
  /**
   * Whether the current environment supports the `IntersectionObserver` API.
   * Starts `false` and settles in a mount effect (SSR-safe).
   */
  isSupported: boolean
  /**
   * Whether the observer is currently running. Starts from the `immediate`
   * option (default `true`) and turns `false` after `pause()` or `stop()`.
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
   * Disconnect the observer and stop observing permanently. Calling it again
   * is a no-op — the hook does not restart after `stop()`.
   */
  stop: () => void
}
/**
 * Detects changes to a target element's visibility.
 *
 * Map from @vueuse/core `useIntersectionObserver`
 * (`source/vueuse/packages/core/useIntersectionObserver/`), which observes
 * every resolved target with a platform `IntersectionObserver` and rebuilds
 * the observer through `watch(...)` whenever the resolved targets, root, root
 * margin or active state change.
 *
 * React divergences:
 * - the Vue `watch` over the targets/root/rootMargin computeds becomes an
 *   effect that re-resolves them after every render and re-observes only when
 *   something actually changed — a re-render that swaps `target.current`
 *   re-observes (mirroring the upstream reactivity), while unchanged renders
 *   never recreate the observer;
 * - `callback` is read through a ref, so changing it does not re-observe and
 *   the returned `stop` stays referentially stable;
 * - `isSupported` is plain `boolean` state settled in the mount effect
 *   (upstream composes `useSupported`, a `ComputedRef<boolean>`);
 * - `tryOnScopeDispose(stop)` becomes an unmount effect that disconnects;
 * - the Pausable members mirror upstream: `isActive` is a plain boolean
 *   starting from the `immediate` option, `pause()` disconnects the observer
 *   and sets `isActive` to `false`, `resume()` re-observes the same targets,
 *   and `stop()` deactivates permanently — `immediate: false` leaves the
 *   observer idle until `resume()` is called;
 * - the observer is constructed through the resolved `window`, and a changed
 *   `window` option re-observes (upstream destructures it once at setup;
 *   this matches this repo's `useResizeObserver`).
 *
 * SSR-safe: nothing touches `window` during render — support detection and
 * observation both happen in effects.
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
