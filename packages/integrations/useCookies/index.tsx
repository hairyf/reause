import { useCallback, useEffect, useRef, useState } from 'react'
import Cookie from 'universal-cookie'

type RawCookies = Record<string, string>

// option/callback shapes are derived from the instance methods so the port
// tracks `universal-cookie`'s own API (upstream uses `Parameters<Cookie['x']>`
// the same way) without importing the ambient-free type-only submodule
type CookieGetOptions = NonNullable<Parameters<Cookie['get']>[1]>
type CookieSetOptions = NonNullable<Parameters<Cookie['set']>[2]>
type CookieValue = Parameters<Cookie['set']>[1]
type CookieChangeListener = Parameters<Cookie['addChangeListener']>[0]

export interface UseCookiesOptions {
  /**
   * Do not convert the cookie into an object no matter what
   *
   * @default false
   */
  doNotParse?: boolean
  /**
   * Automatically add cookie names ever provided to `get` method
   *
   * @default false
   */
  autoUpdateDependencies?: boolean
}

export interface UseCookiesReturn {
  /**
   * Reactive get cookie by name. If **autoUpdateDependencies = true** then it will update watching
   * dependencies
   */
  get: <T = any>(name: string, options?: CookieGetOptions) => T
  /**
   * Reactive get all cookies
   */
  getAll: <T = any>(options?: CookieGetOptions) => T
  /**
   * Set cookie
   *
   * @see https://www.npmjs.com/package/universal-cookie#setname-value-options
   */
  set: (name: string, value: CookieValue, options?: CookieSetOptions) => void
  /**
   * Remove cookie
   *
   * @see https://www.npmjs.com/package/universal-cookie#removename-options
   */
  remove: (name: string, options?: CookieSetOptions) => void
  /**
   * Add a listener fired on every cookie change
   */
  addChangeListener: (callback: CookieChangeListener) => void
  /**
   * Remove a previously added change listener
   */
  removeChangeListener: (callback: CookieChangeListener) => void
}

/**
 * Minimal structural request object accepted by {@link createCookies} for SSR.
 *
 * Deviation from upstream: VueUse types this parameter as Node's `IncomingMessage` (`import type {
 * IncomingMessage } from 'node:http'`), which would pull the Node built-in into a browser bundle.
 * Only `headers.cookie` is actually read, so the port declares that shape itself and keeps the
 * browser build free of any `node:` import.
 */
export interface CreateCookiesRequest {
  headers?: {
    cookie?: string | null
  }
}

/**
 * React port of VueUse's `createCookies` — creates a `universal-cookie` instance from a request
 * (default is `window.document.cookie`) and returns a {@link useCookies} bound to that instance.
 *
 * Map from @vueuse/integrations `createCookies`
 * (`source/vueuse/packages/integrations/useCookies/index.ts`).
 *
 * @param req - incoming request (for SSR); a plain `cookie` header string is
 * also accepted for convenience
 * @see https://github.com/reactivestack/cookies/tree/master/packages/universal-cookie universal-cookie
 *
 * @__NO_SIDE_EFFECTS__
 * @example
 * const useSsrCookies = createCookies({ headers: { cookie: 'locale=en-US' } })
 * const { get } = useSsrCookies(['locale'])
 * get('locale') // 'en-US'
 */
export function createCookies(
  req?: CreateCookiesRequest | string,
): (dependencies?: string[] | null, options?: UseCookiesOptions) => UseCookiesReturn {
  const universalCookie = new Cookie(
    typeof req === 'string' ? req : req?.headers?.cookie ?? null,
  )

  return (
    dependencies?: string[] | null,
    { doNotParse = false, autoUpdateDependencies = false } = {},
  ) => useCookies(dependencies, { doNotParse, autoUpdateDependencies }, universalCookie)
}

/**
 * React port of VueUse's `useCookies` — reactive methods to work with cookies (use {@link
 * createCookies} instead if you are using SSR).
 *
 * Map from @vueuse/integrations `useCookies`
 * (`source/vueuse/packages/integrations/useCookies/index.ts`).
 *
 * React divergences:
 * - upstream returns a **method object** (`get`, `getAll`, `set`, `remove`,
 *   `addChangeListener`, `removeChangeListener`), not a piece of writable
 *   state, so the port returns the same object instead of a tuple (§2B);
 * - upstream's `shallowRef(0)` "touches" counter is a `useState` counter read
 *   in the render body, so a watched cookie change re-renders the component
 *   and the `get`/`getAll` closures from that render observe the new value;
 * - `previousCookies` and the mutable watch list live in refs so they persist across renders;
 * - upstream's `tryOnScopeDispose` maps to a `useEffect` cleanup that removes
 *   the change listener.
 *
 * @param dependencies - array of watching cookie's names. Pass empty array if don't want to watch cookies changes.
 * @param options
 * @param options.doNotParse - don't try parse value as JSON
 * @param options.autoUpdateDependencies - automatically update watching dependencies
 * @param cookies - universal-cookie instance
 *
 * @__NO_SIDE_EFFECTS__
 * @example
 * const { get, set } = useCookies(['locale'])
 * get('locale') // reads reactively
 * set('locale', 'en-US')
 */
export function useCookies(
  dependencies?: string[] | null,
  { doNotParse = false, autoUpdateDependencies = false }: UseCookiesOptions = {},
  cookies: Cookie = new Cookie(),
): UseCookiesReturn {
  // upstream: `const watchingDependencies = autoUpdateDependencies ? [...dependencies || []] : dependencies`
  // — the mutable copy has to survive re-renders, hence the ref
  const watchingDependenciesRef = useRef<string[] | null | undefined>(
    autoUpdateDependencies ? [...dependencies || []] : dependencies,
  )

  // upstream: `let previousCookies = cookies.getAll<RawCookies>({ doNotParse: true })`
  // (only the first snapshot is kept; initialised lazily instead of eagerly so
  // `cookies.getAll` does not run on every render)
  const previousCookiesRef = useRef<RawCookies | null>(null)
  if (previousCookiesRef.current === null)
    previousCookiesRef.current = cookies.getAll<RawCookies>({ doNotParse: true })

  // upstream: `const touches = shallowRef(0)` — reading `touches` in the render
  // body is what makes `get`/`getAll` reactive
  const [touches, setTouches] = useState(0)
  void touches

  // re-sync the watch list when the caller hands a different `dependencies`
  // prop; with `autoUpdateDependencies` the accumulated names are kept, exactly
  // like upstream's setup-time snapshot. The refresh is gated: an inline array
  // gets a new identity on every render and must not wipe the names `get()`
  // has pushed, otherwise a cookie watched through `get()` stops being watched
  // after the first re-render.
  const previousDependenciesRef = useRef(dependencies)
  useEffect(() => {
    if (previousDependenciesRef.current === dependencies)
      return
    previousDependenciesRef.current = dependencies
    if (!autoUpdateDependencies)
      watchingDependenciesRef.current = dependencies
  }, [dependencies, autoUpdateDependencies])

  const onChange = useCallback(() => {
    const newCookies = cookies.getAll<RawCookies>({ doNotParse: true })
    const previous = previousCookiesRef.current

    // defensive: the lazy init in the render body already snapshotted, so a
    // change listener can never observe a null previous
    if (previous === null) {
      previousCookiesRef.current = newCookies
      return
    }

    if (shouldUpdate(watchingDependenciesRef.current ?? null, newCookies, previous))
      setTouches(n => n + 1)

    previousCookiesRef.current = newCookies
  }, [cookies])

  // upstream: `cookies.addChangeListener(onChange)` + `tryOnScopeDispose(...)`
  useEffect(() => {
    cookies.addChangeListener(onChange)

    return () => {
      cookies.removeChangeListener(onChange)
    }
  }, [cookies, onChange])

  return {
    get: <T = any>(name: string, options?: CookieGetOptions) => {
      const watchingDependencies = watchingDependenciesRef.current

      /**
       * Auto update watching dependencies if needed
       */
      if (autoUpdateDependencies && watchingDependencies && !watchingDependencies.includes(name))
        watchingDependencies.push(name)

      return cookies.get<T>(name, { doNotParse, ...options })
    },
    getAll: <T = any>(options?: CookieGetOptions) => cookies.getAll<T>({ doNotParse, ...options }),
    set: (name: string, value: CookieValue, options?: CookieSetOptions) => cookies.set(name, value, options),
    remove: (name: string, options?: CookieSetOptions) => cookies.remove(name, options),
    addChangeListener: (callback: CookieChangeListener) => cookies.addChangeListener(callback),
    removeChangeListener: (callback: CookieChangeListener) => cookies.removeChangeListener(callback),
  }
}

function shouldUpdate(
  dependencies: string[] | null,
  newCookies: RawCookies,
  oldCookies: RawCookies,
) {
  if (!dependencies)
    return true

  for (const dependency of dependencies) {
    if (newCookies[dependency] !== oldCookies[dependency])
      return true
  }

  return false
}
