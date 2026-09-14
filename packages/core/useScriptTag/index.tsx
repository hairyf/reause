import { useCallback, useEffect, useRef, useState } from 'react'

function noop() {}

/**
 * Options for `useScriptTag`.
 */
export interface UseScriptTagOptions {
  /**
   * Load the script immediately
   *
   * @default true
   */
  immediate?: boolean

  /**
   * Manual controls the timing of loading and unloading
   *
   * @default false
   */
  manual?: boolean

  /**
   * Add `async` attribute to the script tag
   *
   * @default true
   */
  async?: boolean

  /**
   * Script type
   *
   * @default 'text/javascript'
   */
  type?: string

  crossOrigin?: 'anonymous' | 'use-credentials'
  referrerPolicy?: 'no-referrer' | 'no-referrer-when-downgrade' | 'origin' | 'origin-when-cross-origin' | 'same-origin' | 'strict-origin' | 'strict-origin-when-cross-origin' | 'unsafe-url'
  noModule?: boolean

  defer?: boolean

  /**
   * Add custom attribute to the script tag
   */
  attrs?: Record<string, string>

  /**
   * Nonce value for CSP (Content Security Policy)
   *
   * @default undefined
   */
  nonce?: string

  /**
   * Custom `document` instance (upstream folds this option into `ConfigurableDocument`). Resolved
   * lazily at load time and defaults to the global `document`, so importing and rendering on the
   * server is safe.
   */
  document?: Document
}

/**
 * Return type of `useScriptTag`.
 */
export interface UseScriptTagReturn {
  /**
   * The script element once a load has been requested (and settled for `load()`), `null` before
   * that and again after `unload`.
   */
  scriptTag: HTMLScriptElement | null

  /**
   * Load the script specified via `src`. Repeated calls share the same in-flight promise instead of
   * creating a second script tag.
   *
   * @param waitForScriptLoad Whether if the Promise should resolve once the "load" event is emitted by the <script> attribute, or right after appending it to the DOM.
   * @returns Promise<HTMLScriptElement | boolean>
   */
  load: (waitForScriptLoad?: boolean) => Promise<HTMLScriptElement | boolean>

  /**
   * Unload the script specified by `src`.
   */
  unload: () => void
}

/**
 * Map from @vueuse/core `useScriptTag`
 * (`source/vueuse/packages/core/useScriptTag/`). Async script tag loading —
 * appends a `<script>` element for `src` to `document.head` (reusing an existing tag for the same
 * `src`), and can remove the tag again. By default the script loads on mount and unloads on
 * unmount.
 *
 * React divergences:
 * - `src` is a plain string (upstream `MaybeRefOrGetter<string>`);
 * - the `scriptTag` shallowRef becomes plain state — a
 *   `HTMLScriptElement | null` value that stays `null` during render, so no
 *   document access happens while rendering (SSR-safe);
 * - `src`, `onLoaded` and options are read through latest-value refs, so the
 *   returned `load`/`unload` are stable callbacks;
 * - the mount auto-load and unmount auto-unload run in one `useEffect`
 *   (upstream `tryOnMounted`/`tryOnUnmounted`), and the script's
 *   `error`/`abort`/`load` listeners are detached on unmount (upstream
 *   delegates that to `useEventListener`'s scope disposal);
 * - the upstream `ConfigurableDocument` option is inlined as `document?` on
 *   `UseScriptTagOptions`.
 *
 * @example
 * const { scriptTag, load, unload } = useScriptTag(
 *   'https://player.twitch.tv/js/embed/v1.js',
 *   (el: HTMLScriptElement) => {
 *     // do something
 *   },
 * )
 */
export function useScriptTag(
  src: string,
  onLoaded: (el: HTMLScriptElement) => void = noop,
  options: UseScriptTagOptions = {},
): UseScriptTagReturn {
  // latest-value refs synced each render so `load`/`unload` below are stable
  // callbacks that always read the newest src, callback and options
  const srcRef = useRef(src)
  const onLoadedRef = useRef(onLoaded)
  const optionsRef = useRef(options)
  srcRef.current = src
  onLoadedRef.current = onLoaded
  optionsRef.current = options

  const [scriptTag, setScriptTag] = useState<HTMLScriptElement | null>(null)

  // singleton in-flight promise, so repeated `load()` calls share one script
  const promiseRef = useRef<Promise<HTMLScriptElement | boolean> | null>(null)
  // listeners currently attached for the in-flight script, detached on unmount
  const listenersRef = useRef<{ detach: () => void } | null>(null)

  const loadScript = useCallback((waitForScriptLoad: boolean): Promise<HTMLScriptElement | boolean> => new Promise((resolve, reject) => {
    const {
      type = 'text/javascript',
      async = true,
      crossOrigin,
      referrerPolicy,
      noModule,
      defer,
      attrs = {},
      nonce,
    } = optionsRef.current

    // Some little closure for resolving the Promise.
    const resolveWithElement = (el: HTMLScriptElement) => {
      setScriptTag(el)
      resolve(el)
      return el
    }

    // Check if document actually exists, otherwise resolve the Promise (SSR Support).
    const doc = optionsRef.current.document ?? (typeof document === 'undefined' ? undefined : document)
    if (!doc) {
      resolve(false)
      return
    }

    // Local variable defining if the <script> tag should be appended or not.
    let shouldAppend = false

    let el = doc.querySelector<HTMLScriptElement>(`script[src="${srcRef.current}"]`)

    // Script tag not found, preparing the element for appending
    if (!el) {
      const script = doc.createElement('script')
      script.type = type
      script.async = async
      script.src = srcRef.current

      // Optional attributes
      if (defer)
        script.defer = defer
      if (crossOrigin)
        script.crossOrigin = crossOrigin
      if (noModule)
        script.noModule = noModule
      if (referrerPolicy)
        script.referrerPolicy = referrerPolicy
      if (nonce)
        script.nonce = nonce
      Object.entries(attrs).forEach(([name, value]) => script.setAttribute(name, value))

      // Enables shouldAppend
      el = script
      shouldAppend = true
    }
    // Script tag already exists, resolve the loading Promise with it.
    else if (el.hasAttribute('data-loaded')) {
      resolveWithElement(el)
    }

    const target = el

    // Event listeners
    const onError = (event: Event) => reject(event)
    const onAbort = (event: Event) => reject(event)
    const onLoad = () => {
      target.setAttribute('data-loaded', 'true')

      onLoadedRef.current(target)
      resolveWithElement(target)
    }

    target.addEventListener('error', onError, { passive: true })
    target.addEventListener('abort', onAbort, { passive: true })
    target.addEventListener('load', onLoad, { passive: true })
    listenersRef.current = {
      detach: () => {
        target.removeEventListener('error', onError)
        target.removeEventListener('abort', onAbort)
        target.removeEventListener('load', onLoad)
      },
    }

    // Append the <script> tag to head.
    if (shouldAppend)
      doc.head.appendChild(target)

    // If script load awaiting isn't needed, we can resolve the Promise.
    if (!waitForScriptLoad)
      resolveWithElement(target)
  }), [])

  /**
   * Exposed singleton wrapper for `loadScript`, avoiding calling it twice.
   */
  const load = useCallback((waitForScriptLoad = true): Promise<HTMLScriptElement | boolean> => {
    if (!promiseRef.current)
      promiseRef.current = loadScript(waitForScriptLoad)

    return promiseRef.current
  }, [loadScript])

  /**
   * Unload the script specified by `src`.
   */
  const unload = useCallback(() => {
    const doc = optionsRef.current.document ?? (typeof document === 'undefined' ? undefined : document)
    if (!doc)
      return

    promiseRef.current = null

    setScriptTag(null)

    listenersRef.current = null

    const el = doc.querySelector<HTMLScriptElement>(`script[src="${srcRef.current}"]`)
    if (el)
      doc.head.removeChild(el)
  }, [])

  // Auto-load on mount and auto-unload on unmount (upstream wires
  // `tryOnMounted(load)` / `tryOnUnmounted(unload)`; the flags are read from
  // the options captured at mount time, matching upstream's setup-time
  // destructure).
  useEffect(() => {
    const { immediate = true, manual = false } = optionsRef.current

    if (immediate && !manual)
      load()

    return () => {
      listenersRef.current?.detach()
      listenersRef.current = null

      if (!manual)
        unload()
    }
  }, [load, unload])

  return { scriptTag, load, unload }
}
