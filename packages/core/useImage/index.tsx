import { noop, promiseTimeout } from '@reause/shared'
import { useCallback, useEffect, useRef, useState } from 'react'

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
  loading?: HTMLImageElement['loading']
  /** Image CORS settings */
  crossorigin?: string
  /** Referrer policy for fetch https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Referrer-Policy */
  referrerPolicy?: HTMLImageElement['referrerPolicy']
  /** Image width */
  width?: HTMLImageElement['width']
  /** Image height */
  height?: HTMLImageElement['height']
  /** https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img#decoding */
  decoding?: HTMLImageElement['decoding']
  /** Provides a hint of the relative priority to use when fetching the image */
  fetchPriority?: HTMLImageElement['fetchPriority']
  /** Provides a hint of the importance of the image */
  ismap?: HTMLImageElement['isMap']
  /** The partial URL (starting with #) of an image map associated with the element */
  usemap?: HTMLImageElement['useMap']
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

async function loadImage(options: UseImageOptions): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const { src, srcset, sizes, class: clazz, alt, loading, crossorigin, referrerPolicy, width, height, decoding, fetchPriority, ismap, usemap } = options

    img.src = src

    if (alt != null)
      img.alt = alt
    if (srcset != null)
      img.srcset = srcset
    if (sizes != null)
      img.sizes = sizes
    if (clazz != null)
      img.className = clazz
    if (loading != null)
      img.loading = loading
    if (crossorigin != null)
      img.crossOrigin = crossorigin
    if (referrerPolicy != null)
      img.referrerPolicy = referrerPolicy
    if (width != null)
      img.width = width
    if (height != null)
      img.height = height
    if (decoding != null)
      img.decoding = decoding
    if (fetchPriority != null)
      img.fetchPriority = fetchPriority
    if (ismap != null)
      img.isMap = ismap
    if (usemap != null)
      img.useMap = usemap

    img.onload = () => resolve(img)
    img.onerror = reject
  })
}

/**
 * Reactive load an image in the browser — React port of VueUse's `useImage`.
 *
 * Map from @vueuse/core `useImage`
 * (`source/vueuse/packages/core/useImage/`). Asynchronously loads an image
 * (accepting every `<img>` attribute) and exposes the state of that load so you can render a
 * loading fallback, an error state, or the image once ready.
 *
 * React divergences:
 * - upstream composes `useAsyncState` with a deep `watch` on the options and
 *   returns its full object (`state`, `isReady`, `isLoading`, `error`,
 *   `execute`, `executeImmediate`); here the async state is implemented
 *   inline with React state, so the return is `{ isLoaded, error, url,
 *   isLoading, execute }` — `isLoaded` is upstream's `isReady`, `url` the
 *   `currentSrc` of the last successfully loaded image (upstream's `state`
 *   holds the loaded element itself), and `executeImmediate` is dropped in
 *   favor of `execute(0)`;
 * - `options` is a plain object (upstream `MaybeRefOrGetter<UseImageOptions>`)
 *   — pass a new options object to load a different image. The mount effect is
 *   keyed on a stable `JSON.stringify` of the options, mirroring upstream's
 *   deep `watch`, so changing any attribute reloads the image;
 * - `asyncStateOptions` is read once at mount (upstream destructures it at
 *   setup); `shallow` is meaningless in React and omitted;
 * - rendering never touches the DOM: the load starts in the mount effect, so
 *   server rendering is safe (on the server `execute` rejects with the
 *   unavailable-`Image` error, which is captured in `error`);
 * - unmounting (or a newer `execute`/options change) invalidates the in-flight load via an
 * execution counter, so a stale load can no longer update state execution guard.
 *
 * @example
 * const avatarUrl = 'https://place.dog/300/200'
 * const { isLoading } = useImage({ src: avatarUrl })
 */
export function useImage(
  options: UseImageOptions,
  asyncStateOptions: UseImageAsyncStateOptions = {},
): UseImageReturn {
  // `options` are live — the latest object is kept so a new one reloads;
  // `asyncStateOptions` are frozen at mount, mirroring upstream's
  // setup-time destructure
  const optionsRef = useRef(options)
  optionsRef.current = options
  const asyncStateOptionsRef = useRef(asyncStateOptions)

  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState<unknown>(undefined)
  const [url, setUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // counts executions — an in-flight load whose id is no longer the latest is
  // stale (a newer `execute`, changed options, or unmount) and must not touch
  // state, mirroring upstream `useAsyncState`'s `executionsCount` guard
  const executionsCountRef = useRef(0)

  const execute = useCallback(async (delay = 0): Promise<HTMLImageElement | undefined> => {
    const {
      onError = noop,
      onSuccess = noop,
      resetOnExecute = true,
      throwError = false,
    } = asyncStateOptionsRef.current

    const executionId = (executionsCountRef.current += 1)

    setError(undefined)
    setIsLoaded(false)
    setIsLoading(true)
    if (resetOnExecute)
      setUrl(null)

    if (delay > 0)
      await promiseTimeout(delay)

    // superseded or unmounted during the delay — skip the load entirely
    if (executionId !== executionsCountRef.current)
      return undefined

    try {
      const img = await loadImage(optionsRef.current)
      if (executionId === executionsCountRef.current) {
        setUrl(img.currentSrc || img.src)
        setIsLoaded(true)
      }
      onSuccess(img)
      return img
    }
    catch (e) {
      if (executionId === executionsCountRef.current)
        setError(e)
      onError(e)
      if (throwError)
        throw e
    }
    finally {
      if (executionId === executionsCountRef.current)
        setIsLoading(false)
    }
    return undefined
  }, [])

  // auto-load on mount and reload when the image attributes change (upstream
  // `watch(() => toValue(options), () => state.execute(...), { deep: true })`);
  // the cleanup invalidates the in-flight load before a new one starts and on
  // unmount, aborting it
  const optionsKey = JSON.stringify(options)
  // reloads whenever the options object changes — upstream's `watch` on the
  // options fires unconditionally on change, regardless of `immediate`
  const prevOptionsKeyRef = useRef(optionsKey)

  useEffect(() => {
    const { immediate = true, delay = 0 } = asyncStateOptionsRef.current

    if (prevOptionsKeyRef.current !== optionsKey || immediate)
      void execute(delay)
    prevOptionsKeyRef.current = optionsKey

    return () => {
      executionsCountRef.current += 1
    }
  }, [execute, optionsKey])

  return { isLoaded, error, url, isLoading, execute }
}
