---
category: Browser
---

# useImage

Reactive load an image in the browser

## Usage

```tsx
import { useImage } from '@reause/core'

const avatarUrl = 'https://place.dog/300/200'
const { isLoading } = useImage({ src: avatarUrl })
```

```tsx
const { isLoading, error, url } = useImage({ src: avatarUrl })

if (isLoading)
  return <span>Loading...</span>

if (error)
  return <span>Failed to load image</span>

return <img src={url} alt="avatar" />
```

## Type Declarations

```ts
export interface UseImageOptions {
  /** Address of the resource */
  src: string
  /** Images to use in different situations, e.g., high-resolution displays, small monitors, etc. */
  srcset?: string
  /** Image sizes for different page layouts */
  sizes?: string
  /** Image alternative information */
  alt?: string
  /** Image classes */
  class?: string
  /** Image loading */
  loading?: HTMLImageElement["loading"]
  /** Image CORS settings */
  crossorigin?: string
  /** Referrer policy for fetch https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Referrer-Policy */
  referrerPolicy?: HTMLImageElement["referrerPolicy"]
  /** Image width */
  width?: HTMLImageElement["width"]
  /** Image height */
  height?: HTMLImageElement["height"]
  /** https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img#decoding */
  decoding?: HTMLImageElement["decoding"]
  /** Provides a hint of the relative priority to use when fetching the image */
  fetchPriority?: HTMLImageElement["fetchPriority"]
  /** Provides a hint of the importance of the image */
  ismap?: HTMLImageElement["isMap"]
  /** The partial URL (starting with #) of an image map associated with the element */
  usemap?: HTMLImageElement["useMap"]
}
/**
 * Async-state options, mirroring upstream `useAsyncState`'s `UseAsyncStateOptions` (with `shallow`
 * omitted — React state is always shallow).
 */
export interface UseImageAsyncStateOptions {
  /**
   * Delay for the first execution of the promise when "immediate" is true. In milliseconds.
   *
   * @default 0
   */
  delay?: number
  /**
   * Execute the promise right after the function is invoked. Will apply the delay if any.
   *
   * When set to false, you will need to execute it manually.
   *
   * @default true
   */
  immediate?: boolean
  /**
   * Callback when error is caught.
   */
  onError?: (e: unknown) => void
  /**
   * Callback when success is caught.
   * @param {HTMLImageElement} data
   */
  onSuccess?: (data: HTMLImageElement) => void
  /**
   * Sets the state to initialState before executing the promise.
   *
   * This can be useful when calling the execute function more than once (for example, to refresh
   * data). When set to false, the current state remains unchanged until the promise resolves.
   *
   * @default true
   */
  resetOnExecute?: boolean
  /**
   * An error is thrown when executing the execute function
   *
   * @default false
   */
  throwError?: boolean
}
export interface UseImageReturn {
  /**
   * Whether the last load resolved successfully (upstream `isReady`).
   */
  isLoaded: boolean
  /**
   * The error of the last failed load, `undefined` otherwise (upstream `error`).
   */
  error: unknown
  /**
   * The `currentSrc` of the last successfully loaded image — `null` until a load succeeds (and
   * while `resetOnExecute` restarts one).
   */
  url: string | null
  /**
   * Whether an image load is currently in progress (upstream `isLoading`).
   */
  isLoading: boolean
  /**
   * (Re)start the image load, optionally delayed, resolving with the loaded image element once its
   * `onload` fires.
   *
   * @param delay Delay in milliseconds before starting the load.
   */
  execute: (delay?: number) => Promise<HTMLImageElement | undefined>
}
/**
 * Map from @vueuse/core `useImage`
 * (`source/vueuse/packages/core/useImage/`).
 *
 * @example
 * const avatarUrl = 'https://place.dog/300/200'
 * const { isLoading } = useImage({ src: avatarUrl })
 */
export declare function useImage(
  options: UseImageOptions,
  asyncStateOptions?: UseImageAsyncStateOptions,
): UseImageReturn
```
