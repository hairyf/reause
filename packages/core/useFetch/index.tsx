import type { Dispatch, SetStateAction } from 'react'
import { isClient, useTimeoutFn } from '@reause/shared'
import { useCallback, useEffect, useRef, useState } from 'react'

export interface UseFetchReturn<T> {
  /**
   * Indicates if the fetch request has finished
   */
  isFinished: boolean

  /**
   * The statusCode of the HTTP fetch response
   */
  statusCode: number | null

  /**
   * Set `statusCode` directly — the React equivalent of writing upstream's writable `statusCode`
   * shallowRef. Accepts the React immutable-update protocol: `setStatusCode(next)` or
   * `setStatusCode(prev => next)`.
   */
  setStatusCode: Dispatch<SetStateAction<number | null>>

  /**
   * The raw response of the fetch response
   */
  response: Response | null

  /**
   * Set `response` directly — the React equivalent of writing upstream's writable `response`
   * shallowRef. Accepts the React immutable-update protocol: `setResponse(next)` or
   * `setResponse(prev => next)`.
   */
  setResponse: Dispatch<SetStateAction<Response | null>>

  /**
   * Any fetch errors that may have occurred
   */
  error: any

  /**
   * Set `error` directly — the React equivalent of writing upstream's writable `error` shallowRef.
   * Accepts the React immutable-update protocol: `setError(next)` or `setError(prev => next)`.
   */
  setError: Dispatch<SetStateAction<any>>

  /**
   * The fetch response body on success, may either be JSON or text
   */
  data: T | null

  /**
   * Set `data` directly, without triggering a request — the React equivalent of writing upstream's
   * writable `data` shallowRef (`data.value = next`). Accepts the React immutable-update protocol:
   * `setData(next)` or `setData(prev => next)`.
   */
  setData: Dispatch<SetStateAction<T | null>>

  /**
   * Indicates if the request is currently being fetched.
   */
  isFetching: boolean

  /**
   * Indicates if the fetch request is able to be aborted
   */
  canAbort: boolean

  /**
   * Indicates if the fetch request was aborted
   */
  aborted: boolean

  /**
   * Set `aborted` directly, without triggering a request — the React equivalent of writing
   * upstream's writable `aborted` shallowRef. Accepts the React immutable-update protocol:
   * `setAborted(next)` or `setAborted(prev => next)`.
   */
  setAborted: Dispatch<SetStateAction<boolean>>

  /**
   * Abort the fetch request
   */
  abort: (reason?: any) => void

  /**
   * Manually call the fetch (default not throwing error)
   */
  execute: (throwOnFailed?: boolean) => Promise<any>

  /**
   * Fires after the fetch request has finished
   */
  onFetchResponse: EventHookOn<Response>

  /**
   * Fires after a fetch request error
   */
  onFetchError: EventHookOn

  /**
   * Fires after a fetch has completed
   */
  onFetchFinally: EventHookOn

  // methods
  get: () => UseFetchReturn<T> & PromiseLike<UseFetchReturn<T>>
  post: (payload?: unknown, type?: string) => UseFetchReturn<T> & PromiseLike<UseFetchReturn<T>>
  put: (payload?: unknown, type?: string) => UseFetchReturn<T> & PromiseLike<UseFetchReturn<T>>
  delete: (payload?: unknown, type?: string) => UseFetchReturn<T> & PromiseLike<UseFetchReturn<T>>
  patch: (payload?: unknown, type?: string) => UseFetchReturn<T> & PromiseLike<UseFetchReturn<T>>
  head: (payload?: unknown, type?: string) => UseFetchReturn<T> & PromiseLike<UseFetchReturn<T>>
  options: (payload?: unknown, type?: string) => UseFetchReturn<T> & PromiseLike<UseFetchReturn<T>>

  // type
  json: <JSON = any>() => UseFetchReturn<JSON> & PromiseLike<UseFetchReturn<JSON>>
  text: () => UseFetchReturn<string> & PromiseLike<UseFetchReturn<string>>
  blob: () => UseFetchReturn<Blob> & PromiseLike<UseFetchReturn<Blob>>
  arrayBuffer: () => UseFetchReturn<ArrayBuffer> & PromiseLike<UseFetchReturn<ArrayBuffer>>
  formData: () => UseFetchReturn<FormData> & PromiseLike<UseFetchReturn<FormData>>
}

type DataType = 'text' | 'json' | 'blob' | 'arrayBuffer' | 'formData'
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS'
type Combination = 'overwrite' | 'chain'

const payloadMapping: Record<string, string> = {
  json: 'application/json',
  text: 'text/plain',
}

export interface BeforeFetchContext {
  /**
   * The computed url of the current request
   */
  url: string

  /**
   * The request options of the current request
   */
  options: RequestInit

  /**
   * Cancels the current request
   */
  cancel: () => void
}

export interface AfterFetchContext<T = any> {
  response: Response

  data: T | null

  context: BeforeFetchContext

  execute: (throwOnFailed?: boolean) => Promise<any>
}

export interface OnFetchErrorContext<T = any, E = any> {
  error: E

  data: T | null

  response: Response | null

  context: BeforeFetchContext

  execute: (throwOnFailed?: boolean) => Promise<any>
}

export interface UseFetchOptions {
  /**
   * Fetch function
   */
  fetch?: typeof window.fetch

  /**
   * Will automatically run fetch when `useFetch` is used
   *
   * @default true
   */
  immediate?: boolean

  /**
   * Will automatically refetch when:
   * - the URL is changed if the URL is a ref
   * - the payload is changed if the payload is a ref
   *
   * @default false
   */
  refetch?: boolean

  /**
   * Initial data before the request finished
   *
   * @default null
   */
  initialData?: any

  /**
   * Timeout for abort request after number of millisecond `0` means use browser default
   *
   * @default 0
   */
  timeout?: number

  /**
   * Allow update the `data` ref when fetch error whenever provided, or mutated in the
   * `onFetchError` callback
   *
   * @default false
   */
  updateDataOnError?: boolean

  /**
   * Will run immediately before the fetch request is dispatched
   */
  beforeFetch?: (ctx: BeforeFetchContext) => Promise<Partial<BeforeFetchContext> | void> | Partial<BeforeFetchContext> | void

  /**
   * Will run immediately after the fetch request is returned. Runs after any 2xx response
   */
  afterFetch?: (ctx: AfterFetchContext) => Promise<Partial<AfterFetchContext>> | Partial<AfterFetchContext>

  /**
   * Will run immediately after the fetch request is returned. Runs after any 4xx and 5xx response
   */
  onFetchError?: (ctx: OnFetchErrorContext) => Promise<Partial<OnFetchErrorContext>> | Partial<OnFetchErrorContext>
}

export interface CreateFetchOptions {
  /**
   * The base URL that will be prefixed to all urls unless urls are absolute
   */
  baseUrl?: string

  /**
   * Determine the inherit behavior for beforeFetch, afterFetch, onFetchError
   * @default 'chain'
   */
  combination?: Combination

  /**
   * Default Options for the useFetch function
   */
  options?: UseFetchOptions

  /**
   * Options for the fetch request
   */
  fetchOptions?: RequestInit
}

type EventHookOn<T = any> = (fn: (param: T) => void) => () => void

/**
 * Minimal event emitter — inlined from @vueuse/shared `createEventHook` (not yet ported to
 * @reause/shared, so kept local with attribution).
 */
function createEventHook<T = any>() {
  const fns: Array<(param: T) => void> = []

  const off = (fn: (param: T) => void) => {
    const index = fns.indexOf(fn)
    if (index !== -1)
      fns.splice(index, 1)
  }

  const on = (fn: (param: T) => void) => {
    fns.push(fn)
    return () => off(fn)
  }

  const trigger = (param: T) => {
    fns.forEach(fn => fn(param))
  }

  return { on, off, trigger }
}

/**
 * !!!IMPORTANT!!!
 *
 * If you update the UseFetchOptions interface, be sure to update this object to include the new
 * options
 */
function isFetchOptions(obj: object): obj is UseFetchOptions {
  return obj && containsProp(obj, 'immediate', 'refetch', 'initialData', 'timeout', 'beforeFetch', 'afterFetch', 'onFetchError', 'fetch', 'updateDataOnError')
}

function containsProp(obj: object, ...props: string[]) {
  return props.some(k => k in obj)
}

const reAbsolute = /^(?:[a-z][a-z\d+\-.]*:)?\/\//i
// A URL is considered absolute if it begins with "<scheme>://" or "//" (protocol-relative URL).
function isAbsoluteURL(url: string) {
  return reAbsolute.test(url)
}

function headersToObject(headers: HeadersInit | undefined): HeadersInit | Record<string, string> | undefined {
  if (typeof Headers !== 'undefined' && headers instanceof Headers)
    return Object.fromEntries(headers.entries())
  return headers
}

function combineCallbacks<T = any>(combination: Combination, ...callbacks: (((ctx: T) => void | Partial<T> | Promise<void | Partial<T>>) | undefined)[]) {
  if (combination === 'overwrite') {
    // use last callback
    return async (ctx: T) => {
      let callback
      for (let i = callbacks.length - 1; i >= 0; i--) {
        if (callbacks[i] != null) {
          callback = callbacks[i]
          break
        }
      }
      if (callback)
        return { ...ctx, ...(await callback(ctx)) }

      return ctx
    }
  }
  else {
    // chaining and combine result
    return async (ctx: T) => {
      for (const callback of callbacks) {
        if (callback)
          ctx = { ...ctx, ...(await callback(ctx)) }
      }

      return ctx
    }
  }
}

function joinPaths(start: string, end: string): string {
  if (!start.endsWith('/') && !end.startsWith('/'))
    return `${start}/${end}`

  if (start.endsWith('/') && end.startsWith('/'))
    return `${start.slice(0, -1)}${end}`

  return `${start}${end}`
}

function payloadKey(payload: unknown): unknown {
  try {
    return JSON.stringify(payload)
  }
  catch {
    return undefined
  }
}

export function createFetch(config: CreateFetchOptions = {}) {
  const _combination = config.combination || 'chain' as Combination
  const _options = config.options || {}
  const _fetchOptions = config.fetchOptions || {}

  function useFactoryFetch(url: string, ...args: any[]): UseFetchReturn<any> & PromiseLike<UseFetchReturn<any>> {
    const baseUrl = config.baseUrl
    const targetUrl = url
    const computedUrl = (baseUrl && !isAbsoluteURL(targetUrl))
      ? joinPaths(baseUrl, targetUrl)
      : targetUrl

    let options = _options
    let fetchOptions = _fetchOptions

    // Merge properties into a single object
    if (args.length > 0) {
      if (isFetchOptions(args[0])) {
        options = {
          ...options,
          ...args[0],
          beforeFetch: combineCallbacks(_combination, _options.beforeFetch, args[0].beforeFetch),
          afterFetch: combineCallbacks(_combination, _options.afterFetch, args[0].afterFetch),
          onFetchError: combineCallbacks(_combination, _options.onFetchError, args[0].onFetchError),
        }
      }
      else {
        fetchOptions = {
          ...fetchOptions,
          ...args[0],
          headers: {
            ...(headersToObject(fetchOptions.headers) || {}),
            ...(headersToObject(args[0].headers) || {}),
          },
        }
      }
    }

    if (args.length > 1 && isFetchOptions(args[1])) {
      options = {
        ...options,
        ...args[1],
        beforeFetch: combineCallbacks(_combination, _options.beforeFetch, args[1].beforeFetch),
        afterFetch: combineCallbacks(_combination, _options.afterFetch, args[1].afterFetch),
        onFetchError: combineCallbacks(_combination, _options.onFetchError, args[1].onFetchError),
      }
    }

    return useFetch(computedUrl, fetchOptions, options)
  }

  return useFactoryFetch as typeof useFetch
}

/**
 * Map from @vueuse/core `useFetch`
 * (`source/vueuse/packages/core/useFetch/`).
 *
 * @example
 * const { data, error, isFetching } = useFetch('https://my-api.com')
 * const { data } = useFetch('https://my-api.com').get().json()
 * const { execute } = useFetch('https://my-api.com', { immediate: false })
 * execute()
 *
 * @see https://vueuse.org/core/useFetch/
 */
export function useFetch<T>(url: string): UseFetchReturn<T> & PromiseLike<UseFetchReturn<T>>
export function useFetch<T>(url: string, useFetchOptions: UseFetchOptions): UseFetchReturn<T> & PromiseLike<UseFetchReturn<T>>
export function useFetch<T>(url: string, options: RequestInit, useFetchOptions?: UseFetchOptions): UseFetchReturn<T> & PromiseLike<UseFetchReturn<T>>

export function useFetch<T>(url: string, ...args: any[]): UseFetchReturn<T> & PromiseLike<UseFetchReturn<T>> {
  const supportsAbort = typeof AbortController === 'function'

  let fetchOptions: RequestInit = {}
  let options: UseFetchOptions = {
    immediate: true,
    refetch: false,
    timeout: 0,
    updateDataOnError: false,
  }

  interface InternalConfig {
    method: HttpMethod
    type: DataType
    payload: unknown
    payloadType?: string
  }

  const config: InternalConfig = {
    method: 'GET',
    type: 'text',
    payload: undefined,
  }

  if (args.length > 0) {
    if (isFetchOptions(args[0]))
      options = { ...options, ...args[0] }
    else
      fetchOptions = args[0]
  }

  if (args.length > 1) {
    if (isFetchOptions(args[1]))
      options = { ...options, ...args[1] }
  }

  const optionsRef = useRef(options)
  const fetchOptionsRef = useRef<RequestInit>(fetchOptions)
  const configRef = useRef(config)
  const refetchOption = optionsRef.current.refetch

  const [isFinished, setIsFinished] = useState(false)
  const [isFetching, setIsFetching] = useState(false)
  const [aborted, setAbortedState] = useState(false)
  const [statusCode, setStatusCodeState] = useState<number | null>(null)
  const [response, setResponseState] = useState<Response | null>(null)
  const [error, setErrorState] = useState<any>(null)
  const [data, setDataState] = useState<T | null>(optionsRef.current.initialData || null)

  // Event hooks — inlined `createEventHook` (see module-level helper).
  const responseEventRef = useRef(createEventHook<Response>())
  const errorEventRef = useRef(createEventHook<any>())
  const finallyEventRef = useRef(createEventHook<any>())

  const controllerRef = useRef<AbortController | undefined>(undefined)
  const executingRef = useRef(false)
  const executeCounterRef = useRef(0)
  const waitersRef = useRef<Array<{ resolve: (value: UseFetchReturn<T>) => void }>>([])

  // fetch is captured once at setup (upstream destructures it once too).
  const fetchRef = useRef<typeof window.fetch | undefined>(
    optionsRef.current.fetch
    ?? (isClient ? window.fetch : undefined)
    ?? (typeof globalThis !== 'undefined' ? globalThis.fetch : undefined),
  )

  const lastUrlRef = useRef(url)
  const lastRefetchRef = useRef(refetchOption)
  const lastPayloadKeyRef = useRef(payloadKey(configRef.current.payload))

  // Live mirror of the current committed state — the shell getters read this,
  // so a shell captured before a re-render still exposes fresh values.
  interface LiveState {
    data: T | null
    error: any
    statusCode: number | null
    response: Response | null
    isFetching: boolean
    isFinished: boolean
    aborted: boolean
    canAbort: boolean
  }
  const liveRef = useRef<LiveState>({
    data,
    error,
    statusCode,
    response,
    isFetching,
    isFinished,
    aborted,
    canAbort: supportsAbort && isFetching,
  })
  liveRef.current = {
    data,
    error,
    statusCode,
    response,
    isFetching,
    isFinished,
    aborted,
    canAbort: supportsAbort && isFetching,
  }

  const valueShellRef = useRef<UseFetchReturn<T> | null>(null)
  const shellRef = useRef<UseFetchReturn<T> & PromiseLike<UseFetchReturn<T>> | null>(null)

  const abort = useCallback((reason?: any) => {
    if (supportsAbort) {
      controllerRef.current?.abort(reason)
      controllerRef.current = new AbortController()
      controllerRef.current.signal.onabort = () => setAbortedState(true)
      fetchOptionsRef.current = {
        ...fetchOptionsRef.current,
        signal: controllerRef.current.signal,
      }
    }
  }, [supportsAbort])

  const timeoutTimer = useTimeoutFn(abort, optionsRef.current.timeout ?? 0, { immediate: false })
  const timerRef = useRef(timeoutTimer)
  timerRef.current = timeoutTimer

  // Public setters paired with the writable members — the React equivalent of
  // writing upstream's writable shallow refs (`data.value = next`, …). Each
  // writes the live mirror synchronously (so a captured shell reads the new
  // value immediately) and commits the React state for the next render.
  const setData = useCallback<Dispatch<SetStateAction<T | null>>>((action) => {
    const prev = liveRef.current.data
    const next = typeof action === 'function' ? (action as (value: T | null) => T | null)(prev) : action
    liveRef.current.data = next
    setDataState(next)
  }, [])

  const setError = useCallback<Dispatch<SetStateAction<any>>>((action) => {
    const prev = liveRef.current.error
    const next = typeof action === 'function' ? (action as (value: any) => any)(prev) : action
    liveRef.current.error = next
    setErrorState(next)
  }, [])

  const setStatusCode = useCallback<Dispatch<SetStateAction<number | null>>>((action) => {
    const prev = liveRef.current.statusCode
    const next = typeof action === 'function' ? (action as (value: number | null) => number | null)(prev) : action
    liveRef.current.statusCode = next
    setStatusCodeState(next)
  }, [])

  const setResponse = useCallback<Dispatch<SetStateAction<Response | null>>>((action) => {
    const prev = liveRef.current.response
    const next = typeof action === 'function' ? (action as (value: Response | null) => Response | null)(prev) : action
    liveRef.current.response = next
    setResponseState(next)
  }, [])

  const setAborted = useCallback<Dispatch<SetStateAction<boolean>>>((action) => {
    const prev = liveRef.current.aborted
    const next = typeof action === 'function' ? (action as (value: boolean) => boolean)(prev) : action
    liveRef.current.aborted = next
    setAbortedState(next)
  }, [])

  const executeRef = useRef<(throwOnFailed?: boolean) => Promise<any>>(() => Promise.resolve(null))

  const execute = useCallback((throwOnFailed = false) => {
    return executeRef.current(throwOnFailed)
  }, [])

  executeRef.current = async (throwOnFailed = false): Promise<any> => {
    abort()

    executingRef.current = true
    setIsFetching(true)
    setIsFinished(false)
    setErrorState(null)
    setStatusCodeState(null)
    setAbortedState(false)

    executeCounterRef.current += 1
    const currentExecuteCounter = executeCounterRef.current

    const defaultFetchOptions: RequestInit = {
      method: configRef.current.method,
      headers: {},
    }

    const payload = configRef.current.payload
    if (payload) {
      const headers = headersToObject(defaultFetchOptions.headers) as Record<string, string>
      // Set the payload to json type only if it's not provided and a literal
      // object or array is provided and the object is not `formData`.
      // The only case we can deduce the content type and `fetch` can't.
      const proto = Object.getPrototypeOf(payload)
      if (!configRef.current.payloadType && (proto === Object.prototype || Array.isArray(proto)) && !(payload instanceof FormData))
        configRef.current.payloadType = 'json'

      if (configRef.current.payloadType)
        headers['Content-Type'] = payloadMapping[configRef.current.payloadType] ?? configRef.current.payloadType

      defaultFetchOptions.body = configRef.current.payloadType === 'json'
        ? JSON.stringify(payload)
        : payload as BodyInit
    }

    let isCanceled = false
    const context: BeforeFetchContext = {
      url,
      options: {
        ...defaultFetchOptions,
        ...fetchOptionsRef.current,
      },
      cancel: () => { isCanceled = true },
    }

    if (optionsRef.current.beforeFetch)
      Object.assign(context, await optionsRef.current.beforeFetch(context))

    if (isCanceled || !fetchRef.current) {
      executingRef.current = false
      setIsFetching(false)
      setIsFinished(true)
      return Promise.resolve(null)
    }

    let responseData: any = null

    if (optionsRef.current.timeout)
      timerRef.current.start()

    const fetchFn = fetchRef.current

    return fetchFn(
      context.url,
      {
        ...defaultFetchOptions,
        ...context.options,
        headers: {
          ...headersToObject(defaultFetchOptions.headers),
          ...headersToObject(context.options?.headers),
        },
      },
    )
      .then(async (fetchResponse) => {
        if (currentExecuteCounter === executeCounterRef.current) {
          setResponseState(fetchResponse)
          setStatusCodeState(fetchResponse.status)
        }

        responseData = await fetchResponse.clone()[configRef.current.type]()

        // see: https://www.tjvantoll.com/2015/09/13/fetch-and-errors/
        if (!fetchResponse.ok) {
          if (currentExecuteCounter === executeCounterRef.current)
            setDataState(optionsRef.current.initialData || null)
          throw new Error(fetchResponse.statusText)
        }

        if (optionsRef.current.afterFetch) {
          ({ data: responseData } = await optionsRef.current.afterFetch({
            data: responseData,
            response: fetchResponse,
            context,
            execute,
          }))
        }
        if (currentExecuteCounter === executeCounterRef.current)
          setDataState(responseData)

        responseEventRef.current.trigger(fetchResponse)
        return fetchResponse
      })
      .catch(async (fetchError) => {
        let errorData = fetchError.message || fetchError.name

        if (optionsRef.current.onFetchError) {
          const result = await optionsRef.current.onFetchError({
            data: responseData,
            error: fetchError,
            response: liveRef.current.response,
            context,
            execute,
          })
          // guard a `void` return (upstream destructures unconditionally and
          // would throw on `undefined` here, leaving an unhandled rejection)
          if (result)
            ({ error: errorData, data: responseData } = result)
        }

        if (currentExecuteCounter === executeCounterRef.current) {
          setErrorState(errorData)
          if (optionsRef.current.updateDataOnError)
            setDataState(responseData)
        }

        errorEventRef.current.trigger(fetchError)
        if (throwOnFailed)
          throw fetchError
        return null
      })
      .finally(() => {
        if (currentExecuteCounter === executeCounterRef.current) {
          executingRef.current = false
          setIsFetching(false)
          setIsFinished(true)
        }
        if (optionsRef.current.timeout)
          timerRef.current.stop()
        finallyEventRef.current.trigger(null)
      })
  }

  const waitUntilFinished = useCallback((): Promise<UseFetchReturn<T>> => {
    if (liveRef.current.isFinished)
      return Promise.resolve(valueShellRef.current as UseFetchReturn<T>)
    return new Promise<UseFetchReturn<T>>((resolve) => {
      waitersRef.current.push({ resolve })
    })
  }, [])

  // resolve pending `await useFetch(...)`/`await useFetch(...).json()` waiters
  // as soon as the current request has finished.
  useEffect(() => {
    if (!isFinished)
      return
    const waiters = waitersRef.current
    waitersRef.current = []
    waiters.forEach(waiter => waiter.resolve(valueShellRef.current as UseFetchReturn<T>))
  }, [isFinished])

  // abort any in-flight request on unmount (and never leave an awaited shell hanging).
  useEffect(() => {
    return () => {
      if (supportsAbort)
        controllerRef.current?.abort()
      const waiters = waitersRef.current
      waitersRef.current = []
      waiters.forEach(waiter => waiter.resolve(valueShellRef.current as UseFetchReturn<T>))
    }
  }, [supportsAbort])

  function setMethod(method: HttpMethod) {
    return (payload?: unknown, payloadType?: string) => {
      if (executingRef.current)
        // upstream returns `undefined` while a request is in-flight
        return undefined as unknown as UseFetchReturn<T> & PromiseLike<UseFetchReturn<T>>
      configRef.current.method = method
      configRef.current.payload = payload
      configRef.current.payloadType = payloadType
      return shellRef.current as UseFetchReturn<T> & PromiseLike<UseFetchReturn<T>>
    }
  }

  function setType(type: DataType) {
    return () => {
      if (executingRef.current)
        // upstream returns `undefined` while a request is in-flight
        return undefined as unknown as UseFetchReturn<T> & PromiseLike<UseFetchReturn<T>>
      configRef.current.type = type
      return shellRef.current as UseFetchReturn<T> & PromiseLike<UseFetchReturn<T>>
    }
  }

  // The "value shell" is the plain `UseFetchReturn` object (live getters over
  // the committed state, plus the chained methods) — used both as the returned
  // object and as the value an awaited shell resolves to.
  function createValueShell(): UseFetchReturn<T> {
    return {
      get isFinished() {
        return liveRef.current.isFinished
      },
      get isFetching() {
        return liveRef.current.isFetching
      },
      get statusCode() {
        return liveRef.current.statusCode
      },
      setStatusCode,
      get response() {
        return liveRef.current.response
      },
      setResponse,
      get error() {
        return liveRef.current.error
      },
      setError,
      get data() {
        return liveRef.current.data
      },
      setData,
      get canAbort() {
        return liveRef.current.canAbort
      },
      get aborted() {
        return liveRef.current.aborted
      },
      setAborted,
      abort,
      execute,
      onFetchResponse: responseEventRef.current.on,
      onFetchError: errorEventRef.current.on,
      onFetchFinally: finallyEventRef.current.on,
      get: setMethod('GET'),
      put: setMethod('PUT'),
      post: setMethod('POST'),
      delete: setMethod('DELETE'),
      patch: setMethod('PATCH'),
      head: setMethod('HEAD'),
      options: setMethod('OPTIONS'),
      json: setType('json') as unknown as UseFetchReturn<T>['json'],
      text: setType('text') as unknown as UseFetchReturn<T>['text'],
      blob: setType('blob') as unknown as UseFetchReturn<T>['blob'],
      arrayBuffer: setType('arrayBuffer') as unknown as UseFetchReturn<T>['arrayBuffer'],
      formData: setType('formData') as unknown as UseFetchReturn<T>['formData'],
    }
  }

  // The thenable shell inherits every member from the value shell and adds
  // `then` for `await useFetch(...)` support. The awaited value is the value
  // shell (a non-thenable), so Promise resolution cannot re-adopt `then`.
  function createThenableShell(): UseFetchReturn<T> & PromiseLike<UseFetchReturn<T>> {
    const shell = Object.create(valueShellRef.current) as UseFetchReturn<T> & PromiseLike<UseFetchReturn<T>>
    shell.then = function then<TResult1 = UseFetchReturn<T>, TResult2 = never>(
      onFulfilled?: ((value: UseFetchReturn<T>) => TResult1 | PromiseLike<TResult1>) | null,
      onRejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
    ): PromiseLike<TResult1 | TResult2> {
      return waitUntilFinished().then(onFulfilled, onRejected)
    }
    return shell
  }

  if (valueShellRef.current === null)
    valueShellRef.current = createValueShell()
  if (shellRef.current === null)
    shellRef.current = createThenableShell()

  // fire the initial request after mount (upstream fires during setup).
  useEffect(() => {
    if (optionsRef.current.immediate)
      void execute()
  }, [execute])

  // mirror upstream `watch([refetch, toRef(url), payload])` — re-fetch when the
  // url or payload changes and refetch is on. `refetch` / `url` / `payload` are
  // plain values, so a change re-runs this effect (dependency below).
  useEffect(() => {
    const needsPolling = Boolean(refetchOption)

    const check = () => {
      const nextRefetch = refetchOption
      const urlChanged = url !== lastUrlRef.current
      const payloadChanged = payloadKey(configRef.current.payload) !== lastPayloadKeyRef.current
      const refetchTurnedOn = nextRefetch && !lastRefetchRef.current
      const shouldExecute = (nextRefetch && (urlChanged || payloadChanged)) || refetchTurnedOn

      lastUrlRef.current = url
      lastPayloadKeyRef.current = payloadKey(configRef.current.payload)
      lastRefetchRef.current = nextRefetch

      if (shouldExecute)
        void execute()
    }

    check()

    if (needsPolling) {
      const timer = setInterval(check, 50)
      return () => clearInterval(timer)
    }
    return undefined
  }, [url, refetchOption, execute])

  return shellRef.current as UseFetchReturn<T> & PromiseLike<UseFetchReturn<T>>
}
