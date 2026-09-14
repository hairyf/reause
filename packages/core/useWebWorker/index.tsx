import { useCallback, useEffect, useRef, useState } from 'react'

type PostMessage = typeof Worker.prototype['postMessage']

type WorkerFn = (...args: unknown[]) => Worker

export interface UseWebWorkerReturn<Data = any> {
  /**
   * Latest data received from the worker (the `e.data` of the message event), `null` until the
   * first message arrives.
   */
  data: Data | null
  /**
   * Sends data to the worker thread. No-op while no worker is mounted.
   */
  post: PostMessage
  /**
   * Stops and terminates the mounted worker.
   */
  terminate: () => void
  /**
   * The Web Worker instance, `undefined` until the mount effect created it.
   */
  worker: Worker | undefined
}

interface UseWebWorkerOptions {
  /**
   * Specify a custom `window` instance, e.g. working with iframes or in testing environments.
   */
  window?: Window
}

/**
 * Map from @vueuse/core `useWebWorker`
 * (`source/vueuse/packages/core/useWebWorker/`), which wraps `new Worker`
 * and exposes the instance, a `post` shortcut, `terminate`, and the latest message data. The
 * dependency-injected worker factory upstream function (`useWebWorkerFn`) is a separate mapping and
 * not part of this port.
 *
 * React divergences:
 * - the worker is created in a mount `useEffect` instead of during setup
 *   (upstream creates it synchronously behind an `if (window)` check), so
 *   SSR renders the initial `null`/`undefined` values without ever touching
 *   `Worker` — SSR-safe;
 * - `post` and `terminate` are stable callbacks reading the mounted worker through a latest-value
 * ref;
 * - the worker is terminated when the component unmounts, including an adopted `Worker` instance
 * passed as the first argument — under React StrictMode the remount cycle terminates an adopted
 * instance, so prefer the factory-function form for those;
 * - `url` and `workerOptions` are read at mount time: changing them does
 *   not recreate the worker (upstream setup runs once), only a change of
 *   the `window` option does.
 *
 * @example
 * const { data, post, terminate, worker } = useWebWorker<string>('/path/to/worker.js')
 * post('hello') // the worker replies via self.postMessage(...)
 */
export function useWebWorker<T = any>(
  url: string,
  workerOptions?: WorkerOptions,
  options?: UseWebWorkerOptions,
): UseWebWorkerReturn<T>

/**
 * Simple Web Workers registration and communication.
 *
 * Accepts an existing `Worker` instance (adopted: its `onmessage` is wired and it is terminated on
 * unmount) or a factory function returning one.
 */
export function useWebWorker<T = any>(worker: Worker | WorkerFn): UseWebWorkerReturn<T>

export function useWebWorker<Data = any>(
  arg0: string | WorkerFn | Worker,
  workerOptions?: WorkerOptions,
  options?: UseWebWorkerOptions,
): UseWebWorkerReturn<Data> {
  const { window: customWindow = typeof window === 'undefined' ? undefined : window } = options ?? {}

  const [data, setData] = useState<Data | null>(null)
  const [worker, setWorker] = useState<Worker | undefined>(undefined)
  // the mounted worker, read by the stable callbacks below
  const workerRef = useRef<Worker | undefined>(undefined)

  // latest-value refs so the mount effect always uses the newest arguments
  const arg0Ref = useRef(arg0)
  const workerOptionsRef = useRef(workerOptions)
  arg0Ref.current = arg0
  workerOptionsRef.current = workerOptions

  const post = useCallback((message: unknown, options?: Transferable[] | StructuredSerializeOptions) => {
    const current = workerRef.current
    if (!current)
      return

    // Forwards once (upstream: `postMessage(...args)`). The branch structure
    // is required: `Worker.postMessage` is overloaded, so TS needs the
    // `Transferable[]` vs `StructuredSerializeOptions` variants narrowed
    // separately before the call.
    if (Array.isArray(options))
      current.postMessage(message, options)
    else if (options)
      current.postMessage(message, options)
    else
      current.postMessage(message)
  }, [])

  const terminate = useCallback(() => {
    const current = workerRef.current
    if (!current)
      return

    current.terminate()
  }, [])

  useEffect(() => {
    // mirrors upstream's `if (window)` guard — no worker outside the browser
    if (!customWindow)
      return

    const source = arg0Ref.current
    const instance = typeof source === 'string'
      ? new Worker(source, workerOptionsRef.current)
      : typeof source === 'function'
        ? source()
        : source

    workerRef.current = instance
    setWorker(instance)

    instance.onmessage = (event: MessageEvent) => {
      setData(event.data as Data)
    }

    return () => {
      // upstream terminates on scope dispose without clearing the ref
      instance.terminate()
    }
  }, [customWindow])

  return { data, post, terminate, worker }
}
