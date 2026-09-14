import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import { noop } from '@reause/shared'
import axios, { AxiosError } from 'axios'
import { useCallback, useEffect, useRef, useState } from 'react'

export interface UseAxiosReturn<T, R = AxiosResponse<T>, _D = any, O extends UseAxiosOptions = UseAxiosOptions<T>> {
  /**
   * Axios Response
   */
  response: R | undefined

  /**
   * Axios response data
   *
   * `O extends UseAxiosOptionsWithInitialData<T>` is `T` (upstream's `Ref<T>` branch), otherwise `T
   * | undefined`.
   */
  data: O extends UseAxiosOptionsWithInitialData<T> ? T : T | undefined

  /**
   * Indicates if the request has finished
   */
  isFinished: boolean

  /**
   * Indicates if the request is currently loading
   */
  isLoading: boolean

  /**
   * Indicates if the request was canceled
   */
  isAborted: boolean

  /**
   * Any errors that may have occurred
   */
  error: unknown | undefined

  /**
   * Aborts the current request
   */
  abort: (message?: string | undefined) => void

  /**
   * Alias to `abort`
   */
  cancel: (message?: string | undefined) => void

  /**
   * Alias to `isAborted`
   */
  isCanceled: boolean
}

export interface StrictUseAxiosReturn<T, R, D, O extends UseAxiosOptions = UseAxiosOptions<T>> extends UseAxiosReturn<T, R, D, O> {
  /**
   * Manually call the axios request — returns the shared thenable shell (upstream `return
   * promise`): `await execute()` resolves with the shell once the request finished, rejecting with
   * the request error on failure; a bare unawaited call never settles eagerly, so it cannot produce
   * an unhandled rejection.
   */
  execute: (url?: string | AxiosRequestConfig<D>, config?: AxiosRequestConfig<D>) => Promise<StrictUseAxiosReturn<T, R, D, O>>
}

export interface EasyUseAxiosReturn<T, R, D> extends UseAxiosReturn<T, R, D> {
  /**
   * Manually call the axios request — returns the shared thenable shell (upstream `return
   * promise`): `await execute(url)` resolves with the shell once the request finished, rejecting
   * with the request error on failure; a bare unawaited call never settles eagerly, so it cannot
   * produce an unhandled rejection.
   */
  execute: (url: string, config?: AxiosRequestConfig<D>) => Promise<EasyUseAxiosReturn<T, R, D>>
}

/**
 * The thenable half of the returned shell — upstream's `promise = { then, catch }` object.
 * `then`/`catch` settle once the latest request finished, resolving with the shell itself (so
 * `const { data } = await useAxios(...)` works) or rejecting with the request error.
 */
export interface UseAxiosThenable<X> extends PromiseLike<X> {
  catch: <TResult = never>(
    onRejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null,
  ) => PromiseLike<X | TResult>
}

export interface UseAxiosOptionsBase<T = any> {
  /**
   * Will automatically run axios request when `useAxios` is used
   */
  immediate?: boolean

  /**
   * Use shallowRef.
   *
   * @default true
   */
  shallow?: boolean

  /**
   * Abort previous request when a new request is made.
   *
   * @default true
   */
  abortPrevious?: boolean

  /**
   * Callback when error is caught.
   */
  onError?: (e: unknown) => void

  /**
   * Callback when success is caught.
   */
  onSuccess?: (data: T) => void

  /**
   * Sets the state to initialState before executing the promise.
   */
  resetOnExecute?: boolean

  /**
   * Callback when request is finished.
   */
  onFinish?: () => void
}

export interface UseAxiosOptionsWithInitialData<T> extends UseAxiosOptionsBase<T> {
  /**
   * Initial data
   */
  initialData: T
}

export type UseAxiosOptions<T = any> = UseAxiosOptionsBase<T> | UseAxiosOptionsWithInitialData<T>

type OverallUseAxiosReturn<T, R, D, O extends UseAxiosOptions = UseAxiosOptions<T>>
  = StrictUseAxiosReturn<T, R, D, O> | EasyUseAxiosReturn<T, R, D>

export function useAxios<T = any, R = AxiosResponse<T>, D = any, O extends UseAxiosOptionsWithInitialData<T> = UseAxiosOptionsWithInitialData<T>>(url: string, config?: AxiosRequestConfig<D>, options?: O): StrictUseAxiosReturn<T, R, D, O> & UseAxiosThenable<StrictUseAxiosReturn<T, R, D, O>>
export function useAxios<T = any, R = AxiosResponse<T>, D = any, O extends UseAxiosOptionsWithInitialData<T> = UseAxiosOptionsWithInitialData<T>>(url: string, instance?: AxiosInstance, options?: O): StrictUseAxiosReturn<T, R, D, O> & UseAxiosThenable<StrictUseAxiosReturn<T, R, D, O>>
export function useAxios<T = any, R = AxiosResponse<T>, D = any, O extends UseAxiosOptionsWithInitialData<T> = UseAxiosOptionsWithInitialData<T>>(url: string, config: AxiosRequestConfig<D>, instance: AxiosInstance, options?: O): StrictUseAxiosReturn<T, R, D, O> & UseAxiosThenable<StrictUseAxiosReturn<T, R, D, O>>
export function useAxios<T = any, R = AxiosResponse<T>, D = any, O extends UseAxiosOptionsBase<T> = UseAxiosOptionsBase<T>>(url: string, config?: AxiosRequestConfig<D>, options?: O): StrictUseAxiosReturn<T, R, D, O> & UseAxiosThenable<StrictUseAxiosReturn<T, R, D, O>>
export function useAxios<T = any, R = AxiosResponse<T>, D = any, O extends UseAxiosOptionsBase<T> = UseAxiosOptionsBase<T>>(url: string, instance?: AxiosInstance, options?: O): StrictUseAxiosReturn<T, R, D, O> & UseAxiosThenable<StrictUseAxiosReturn<T, R, D, O>>
export function useAxios<T = any, R = AxiosResponse<T>, D = any, O extends UseAxiosOptionsBase<T> = UseAxiosOptionsBase<T>>(url: string, config: AxiosRequestConfig<D>, instance: AxiosInstance, options?: O): StrictUseAxiosReturn<T, R, D, O> & UseAxiosThenable<StrictUseAxiosReturn<T, R, D, O>>
export function useAxios<T = any, R = AxiosResponse<T>, D = any>(config?: AxiosRequestConfig<D>): EasyUseAxiosReturn<T, R, D> & UseAxiosThenable<EasyUseAxiosReturn<T, R, D>>
export function useAxios<T = any, R = AxiosResponse<T>, D = any>(instance?: AxiosInstance): EasyUseAxiosReturn<T, R, D> & UseAxiosThenable<EasyUseAxiosReturn<T, R, D>>
export function useAxios<T = any, R = AxiosResponse<T>, D = any>(config?: AxiosRequestConfig<D>, instance?: AxiosInstance): EasyUseAxiosReturn<T, R, D> & UseAxiosThenable<EasyUseAxiosReturn<T, R, D>>

/**
 * React port of VueUse's `useAxios` — wrapper for [`axios`](https://github.com/axios/axios).
 *
 * Map from @vueuse/integrations `useAxios`
 * (`source/vueuse/packages/integrations/useAxios/`). All 12 upstream overloads
 * are kept verbatim (`(url, config?, options?)`, `(url, instance?, options?)`, `(url, config,
 * instance, options?)`, `(config)`, `(instance)`, `(config, instance)`); the url-ful forms expose
 * `execute(url?, config?)`, the url-less forms require `execute(url, config?)`. The returned object
 * mirrors the upstream members — `response`, `data`, `isFinished`, `isLoading`,
 * `isAborted`/`isCanceled`, `error`, `abort`/`cancel`, `execute` — but the members are plain values
 * backed by live getters instead of refs (no `.value`), and the object is thenable (`await
 * useAxios(url)` resolves with the shell once the request settled, rejecting when it failed).
 *
 * React divergences:
 * - the returned object is built with `Object.create` over a getter base whose
 *   members read a synchronously-updated live mirror of the state, so a shell
 *   captured earlier (e.g. the value `await` resolved with) still exposes
 *   fresh values — the same shape `useAsyncState` uses. The base itself is
 *   deliberately NOT thenable, so resolving it can never re-adopt `then`;
 * - `execute` returns the shared thenable shell (upstream `return promise`):
 *   `await execute()` resolves with the shell once the request finished,
 *   rejecting with the request error on failure, and a bare unawaited
 *   `execute()` never settles eagerly — so no unhandled rejection can
 *   escape. `immediate` requests fire from a mount effect (upstream fires
 *   during setup), and the shell is never left without a rejection handler
 *   there;
 * - a pending request, so a late response can never populate `data`/`response` after the component
 * is gone;
 * - `shallow` is accepted for API parity but has no effect: React state is
 *   never deep-wrapped, so there is no `shallowRef`/`ref` distinction here.
 *
 * @__NO_SIDE_EFFECTS__
 * @example
 * const { data, isLoading, isFinished, execute, abort } = useAxios('/api/posts')
 * await execute('/api/posts/2')
 *
 * @see https://vueuse.org/integrations/useAxios
 */
export function useAxios<T = any, R = AxiosResponse<T>, D = any>(...args: any[]): OverallUseAxiosReturn<T, R, D> & UseAxiosThenable<OverallUseAxiosReturn<T, R, D>> {
  const url: string | undefined = typeof args[0] === 'string' ? args[0] : undefined
  const argsPlaceholder = typeof url === 'string' ? 1 : 0
  const defaultOptions: UseAxiosOptions<T> = {
    immediate: !!argsPlaceholder,
    shallow: true,
    abortPrevious: true,
  }
  let defaultConfig: AxiosRequestConfig<D> = {}
  let instance: AxiosInstance = axios
  let options: UseAxiosOptions<T> = defaultOptions

  const isAxiosInstance = (val: any) => !!val?.request

  if (args.length > 0 + argsPlaceholder) {
    /**
     * Unable to use `instanceof` here because of (https://github.com/axios/axios/issues/737) so
     * instead we are checking if there is a `request` on the object to see if it is an axios
     * instance
     */
    if (isAxiosInstance(args[0 + argsPlaceholder]))
      instance = args[0 + argsPlaceholder]
    else
      defaultConfig = args[0 + argsPlaceholder]
  }

  if (args.length > 1 + argsPlaceholder) {
    if (isAxiosInstance(args[1 + argsPlaceholder]))
      instance = args[1 + argsPlaceholder]
  }
  if (
    (args.length === 2 + argsPlaceholder && !isAxiosInstance(args[1 + argsPlaceholder]))
    || args.length === 3 + argsPlaceholder
  ) {
    options = args[args.length - 1] || defaultOptions
  }

  const {
    onSuccess = noop,
    onError = noop,
    immediate,
    resetOnExecute = false,
  } = options

  const initialData = (options as UseAxiosOptionsWithInitialData<T>).initialData

  // latest-value mirrors: the stable callbacks/effects below always read the
  // newest inputs instead of the values captured by the first render
  const urlRef = useRef(url)
  urlRef.current = url
  const configRef = useRef(defaultConfig)
  configRef.current = defaultConfig
  const instanceRef = useRef(instance)
  instanceRef.current = instance
  const optionsRef = useRef(options)
  optionsRef.current = options
  const immediateRef = useRef(immediate)
  immediateRef.current = immediate
  const resetOnExecuteRef = useRef(resetOnExecute)
  resetOnExecuteRef.current = resetOnExecute
  const initialDataRef = useRef(initialData)
  initialDataRef.current = initialData
  const onSuccessRef = useRef(onSuccess)
  onSuccessRef.current = onSuccess
  const onErrorRef = useRef(onError)
  onErrorRef.current = onError
  const onFinishRef = useRef(options.onFinish)
  onFinishRef.current = options.onFinish

  const [response, setResponse] = useState<R | undefined>(undefined)
  const [data, setData] = useState<T | undefined>(initialData)
  const [isFinished, setIsFinished] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isAborted, setIsAborted] = useState(false)
  const [error, setError] = useState<unknown>(undefined)

  // live mirror of the exposed state, updated synchronously next to every
  // state update (upstream refs are synchronous too; React state only commits
  // on the next render) — the shell getters read this
  const liveRef = useRef({ response, data, isFinished, isLoading, isAborted, error })

  const abortControllerRef = useRef<AbortController | null>(null)
  if (abortControllerRef.current === null)
    abortControllerRef.current = new AbortController()

  // execution counter: only the newest request may clear the loading state
  const executeCounterRef = useRef(0)
  const waitersRef = useRef<Array<{
    resolve: (value: OverallUseAxiosReturn<T, R, D>) => void
    reject: (reason?: any) => void
  }>>([])
  const baseRef = useRef<OverallUseAxiosReturn<T, R, D> | null>(null)
  // the composite thenable shell returned by `execute` (upstream's `promise`)
  // and awaited by `await useAxios(...)` — created once per render, but only
  // READ from callbacks/effects that run after the render body, so the ref is
  // always populated by call time
  const shellRef = useRef<OverallUseAxiosReturn<T, R, D> & UseAxiosThenable<OverallUseAxiosReturn<T, R, D>> | null>(null)

  const abort = useCallback((message?: string) => {
    if (liveRef.current.isFinished || !liveRef.current.isLoading)
      return

    abortControllerRef.current?.abort(message)
    abortControllerRef.current = new AbortController()
    liveRef.current.isAborted = true
    liveRef.current.isLoading = false
    liveRef.current.isFinished = false
    setIsAborted(true)
    setIsLoading(false)
    setIsFinished(false)
  }, [])

  const loading = useCallback((value: boolean) => {
    liveRef.current.isLoading = value
    liveRef.current.isFinished = !value
    setIsLoading(value)
    setIsFinished(!value)
  }, [])

  /**
   * Reset data to initialData
   */
  const resetData = useCallback(() => {
    if (!resetOnExecuteRef.current)
      return
    liveRef.current.data = initialDataRef.current
    setData(initialDataRef.current)
  }, [])

  // resolves the `await useAxios(...)` waiters with the latest shell — the
  // promise contract of upstream's `waitUntilFinished` (reject when `error` is
  // set), driven by the effect below plus the settle path of `execute`
  const drainWaiters = useCallback(() => {
    const waiters = waitersRef.current
    if (waiters.length === 0)
      return
    waitersRef.current = []
    const currentError = liveRef.current.error
    const result = baseRef.current as OverallUseAxiosReturn<T, R, D>
    waiters.forEach(({ resolve, reject }) => {
      if (currentError)
        reject(currentError)
      else
        resolve(result)
    })
  }, [])

  const execute = useCallback((
    executeUrl: string | AxiosRequestConfig<D> | undefined = urlRef.current,
    config: AxiosRequestConfig<D> = {},
  ): OverallUseAxiosReturn<T, R, D> & UseAxiosThenable<OverallUseAxiosReturn<T, R, D>> => {
    liveRef.current.error = undefined
    setError(undefined)

    const _url = typeof executeUrl === 'string'
      ? executeUrl
      : urlRef.current ?? config.url

    if (_url === undefined) {
      // upstream: `error.value = new AxiosError(...)`, `isFinished.value = true`,
      // `return promise` — no throw here; the error surfaces only when the
      // returned shell is awaited (its `waitUntilFinished` sees the error)
      const invalidUrlError = new AxiosError(AxiosError.ERR_INVALID_URL)
      liveRef.current.error = invalidUrlError
      liveRef.current.isFinished = true
      setError(invalidUrlError)
      setIsFinished(true)
      return shellRef.current as OverallUseAxiosReturn<T, R, D> & UseAxiosThenable<OverallUseAxiosReturn<T, R, D>>
    }

    resetData()

    if (optionsRef.current.abortPrevious !== false)
      abort()

    loading(true)

    executeCounterRef.current += 1
    const currentExecuteCounter = executeCounterRef.current
    liveRef.current.isAborted = false
    setIsAborted(false)

    // upstream fires the request and returns the shared thenable (`return
    // promise`); the request updates state through its own promise chain and
    // errors surface only when the returned shell is awaited — a bare
    // unawaited `execute()` never settles eagerly, so no unhandled rejection
    void instanceRef.current(_url, {
      ...configRef.current,
      ...typeof executeUrl === 'object' ? executeUrl : config,
      // the fresh controller created by `abort()` above, so the new request
      // is not cancelled by the abort of the previous one
      signal: abortControllerRef.current?.signal,
    })
      .then((result: any) => {
        if (liveRef.current.isAborted)
          return
        liveRef.current.response = result
        setResponse(result)
        const payload = (result as unknown as { data?: T })?.data as T
        liveRef.current.data = payload
        setData(payload)
        onSuccessRef.current(payload)
      })
      .catch((e: unknown) => {
        liveRef.current.error = e
        setError(e)
        onErrorRef.current(e)
      })
      .finally(() => {
        onFinishRef.current?.()
        if (currentExecuteCounter === executeCounterRef.current) {
          loading(false)
          drainWaiters()
        }
      })

    return shellRef.current as OverallUseAxiosReturn<T, R, D> & UseAxiosThenable<OverallUseAxiosReturn<T, R, D>>
  }, [abort, drainWaiters, loading, resetData])

  // the base shell is deliberately NOT a thenable — `drainWaiters` resolves
  // with its plain shape (the `then` lives on the returned composite) so
  // promise resolution can never re-adopt `then`
  const base = {
    get response() {
      return liveRef.current.response
    },
    get data() {
      return liveRef.current.data
    },
    get isFinished() {
      return liveRef.current.isFinished
    },
    get isLoading() {
      return liveRef.current.isLoading
    },
    get isAborted() {
      return liveRef.current.isAborted
    },
    get isCanceled() {
      return liveRef.current.isAborted
    },
    get error() {
      return liveRef.current.error
    },
    abort,
    cancel: abort,
    execute,
  } as unknown as OverallUseAxiosReturn<T, R, D>
  baseRef.current = base

  const waitUntilFinished = useCallback((): Promise<OverallUseAxiosReturn<T, R, D>> => {
    return new Promise<OverallUseAxiosReturn<T, R, D>>((resolve, reject) => {
      if (!liveRef.current.isLoading) {
        const currentError = liveRef.current.error
        if (currentError)
          reject(currentError)
        else
          resolve(baseRef.current as OverallUseAxiosReturn<T, R, D>)
        return
      }
      waitersRef.current.push({ resolve, reject })
    })
  }, [])

  // upstream fires the initial execution during setup — React fires it from a
  // mount effect (exactly once) when a url is available
  useEffect(() => {
    if (immediateRef.current && urlRef.current)
      void execute().catch(noop)
  }, [execute])

  // React-safety deviation: a request still in flight when the component
  // unmounts is aborted, so its late response can never populate the state
  useEffect(() => () => {
    abortControllerRef.current?.abort()
  }, [])

  // resolve the `await useAxios(...)` waiters once a load cycle completes
  useEffect(() => {
    if (isLoading)
      return
    drainWaiters()
  }, [isLoading, drainWaiters])

  // the composite shell is built via `Object.create` (NOT object spread —
  // spread materializes accessor values into dead data properties) so every
  // member stays a live getter over `liveRef`
  const shell = Object.create(base) as OverallUseAxiosReturn<T, R, D> & UseAxiosThenable<OverallUseAxiosReturn<T, R, D>>
  shell.then = function then<TResult1 = OverallUseAxiosReturn<T, R, D>, TResult2 = never>(
    onFulfilled?: ((value: OverallUseAxiosReturn<T, R, D>) => TResult1 | PromiseLike<TResult1>) | null,
    onRejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return waitUntilFinished().then(onFulfilled, onRejected)
  }
  shell.catch = function catchFn<TResult = never>(
    onRejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null,
  ): PromiseLike<OverallUseAxiosReturn<T, R, D> | TResult> {
    return waitUntilFinished().catch(onRejected)
  }

  shellRef.current = shell

  return shell
}
