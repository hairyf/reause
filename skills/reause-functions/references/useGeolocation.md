---
category: Sensors
---

# useGeolocation

Reactive [Geolocation API](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API)

## Usage

```tsx
import { useGeolocation } from '@reause/core'

const { coords, locatedAt, error, resume, pause } = useGeolocation()
```

| State     | Type                                                                                     | Description                                                              |
| --------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| coords    | [`Coordinates`](https://developer.mozilla.org/en-US/docs/Web/API/GeolocationCoordinates) | information about the position retrieved like the latitude and longitude |
| locatedAt | `number \| null`                                                                         | The time of the last geolocation call (epoch ms)                         |
| error     | `GeolocationPositionError \| null`                                                       | The `GeolocationPositionError` in case the geolocation API fails.        |
| resume    | `function`                                                                               | Control function to resume updating geolocation                          |
| pause     | `function`                                                                               | Control function to pause updating geolocation                           |

## Config

`useGeolocation` function takes [PositionOptions](https://developer.mozilla.org/en-US/docs/Web/API/PositionOptions) object as an optional parameter.

## Type Declarations

```ts
/**
 * Specify a custom `navigator` instance, e.g. working with iframes or in testing environments.
 * Declared inline instead of re-exporting upstream's configurable-navigator interface (see
 * `useUserMedia`) to keep the barrel export collision-free.
 */
interface ConfigurableNavigator {
  navigator?: Navigator
}
export interface UseGeolocationOptions
  extends Partial<PositionOptions>, ConfigurableNavigator {
  /**
   * Start watching the position immediately on mount.
   *
   * @default true
   */
  immediate?: boolean
}
export interface UseGeolocationReturn {
  /**
   * Whether the `navigator.geolocation` API is available in the current environment. `false` during
   * render and on the server, resolved in a mount effect.
   */
  isSupported: boolean
  /**
   * Information about the position retrieved like the latitude and longitude.
   */
  coords: Omit<GeolocationPosition["coords"], "toJSON">
  /**
   * The time of the last geolocation call.
   */
  locatedAt: number | null
  /**
   * An error in case the geolocation API fails.
   */
  error: GeolocationPositionError | null
  /**
   * Control function to resume updating geolocation.
   */
  resume: () => void
  /**
   * Control function to pause updating geolocation.
   */
  pause: () => void
}
/**
 * Map from @vueuse/core `useGeolocation`
 * (`source/vueuse/packages/core/useGeolocation/`).
 *
 * @see https://vueuse.org/core/useGeolocation/
 * @param options
 *
 * @example
 * const { coords, locatedAt, error, resume, pause } = useGeolocation()
 */
export declare function useGeolocation(
  options?: UseGeolocationOptions,
): UseGeolocationReturn
```
