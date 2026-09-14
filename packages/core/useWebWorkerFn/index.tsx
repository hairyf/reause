import { useCallback, useEffect, useRef, useState } from 'react'

export type WebWorkerStatus
  = 'PENDING'
    | 'SUCCESS'
    | 'RUNNING'
    | 'ERROR'
    | 'TIMEOUT_EXPIRED'

export interface UseWebWorkerOptions {
  /**
   * Number of milliseconds before killing the worker
   *
   * @default undefined
   */
  timeout?: number
  /**
   * An array that contains the external dependencies needed to run the worker
   */
  dependencies?: string[]
  /**
   * An array that contains the local dependencies needed to run the worker
   */
  localDependencies?: ((...args: any[]) => any)[]
  /**
   * Specify a custom `window` instance, e.g. working with iframes or in testing environments.
   */
  window?: Window
}

export interface UseWebWorkerFnReturn<T extends (...fnArgs: any[]) => any> {
  workerFn: (...fnArgs: Parameters<T>) => Promise<ReturnType<T>>
  workerStatus: WebWorkerStatus
  workerTerminate: (status?: WebWorkerStatus) => void
}

/**
 * Concatenates the dependencies into a comma separated string, used as the argument of the worker's
 * `importScripts` call. Local dependencies are stringified and hoisted into the worker script as
 * `const` bindings.
 *
 * Port of upstream `source/vueuse/packages/core/useWebWorkerFn/lib/depsParser.ts`.
 */
function depsParser(deps: string[], localDeps: ((...args: any[]) => any)[]) {
  if (deps.length === 0 && localDeps.length === 0)
    return ''

  const depsString = deps.map(dep => `'${dep}'`).toString()
  const depsFunctionString = localDeps.filter(dep => typeof dep === 'function').map((fn) => {
    const str = fn.toString()
    if (str.trim().startsWith('function')) {
      return str
    }
    else {
      const name = fn.name
      return `const ${name} = ${str}`
    }
  }).join(';')
  const importString = `importScripts(${depsString});`

  return `${depsString.trim() === '' ? '' : importString} ${depsFunctionString}`
}

/**
 * Returns the `onmessage` handler that runs inside the worker: it unpacks the posted arguments,
 * applies `userFunc`, and posts back `['SUCCESS', result]` / `['ERROR', error]` tuples.
 *
 * Port of upstream `source/vueuse/packages/core/useWebWorkerFn/lib/jobRunner.ts`.
 */
function jobRunner(userFunc: (...args: any[]) => any) {
  return (e: MessageEvent) => {
    const userFuncArgs = e.data[0]
    /* eslint-disable-next-line prefer-spread */
    return Promise.resolve(userFunc.apply(undefined, userFuncArgs))
      .then((result) => {
        postMessage(['SUCCESS', result])
      })
      .catch((error) => {
        postMessage(['ERROR', error])
      })
  }
}

/**
 * Converts `fn` (plus its dependencies) into the source of a worker script and returns a blob URL
 * for it.
 *
 * Port of upstream `source/vueuse/packages/core/useWebWorkerFn/lib/createWorkerBlobUrl.ts`.
 */
function createWorkerBlobUrl(fn: (...args: any[]) => any, deps: string[], localDeps: ((...args: any[]) => any)[]) {
  const blobCode = `${depsParser(deps, localDeps)}; onmessage=(${jobRunner})(${fn})`
  const blob = new Blob([blobCode], { type: 'text/javascript' })
  const url = URL.createObjectURL(blob)
  return url
}

/**
 * Map from @vueuse/core `useWebWorkerFn`
 * (`source/vueuse/packages/core/useWebWorkerFn/`).
 *
 * @example
 * const { workerFn, workerStatus, workerTerminate } = useWebWorkerFn(() => {
 *   // some heavy works to do in web worker
 * })
 */
export function useWebWorkerFn<T extends (...fnArgs: any[]) => any>(fn: T, options: UseWebWorkerOptions = {}): UseWebWorkerFnReturn<T> {
  const {
    dependencies = [],
    localDependencies = [],
    timeout,
    window: customWindow = typeof window === 'undefined' ? undefined : window,
  } = options

  const [workerStatus, setWorkerStatus] = useState<WebWorkerStatus>('PENDING')

  // latest values read by the stable callbacks below
  const fnRef = useRef(fn)
  const dependenciesRef = useRef(dependencies)
  const localDependenciesRef = useRef(localDependencies)
  const timeoutRef = useRef(timeout)
  const windowRef = useRef(customWindow)
  fnRef.current = fn
  dependenciesRef.current = dependencies
  localDependenciesRef.current = localDependencies
  timeoutRef.current = timeout
  windowRef.current = customWindow

  // the currently running worker, its pending promise, its timeout, and a
  // synchronous mirror of the status for the "one instance at a time" guard
  const workerRef = useRef<(Worker & { _url?: string }) | undefined>(undefined)
  const promiseRef = useRef<{
    reject?: (result: ReturnType<T> | ErrorEvent) => void
    resolve?: (result: ReturnType<T>) => void
  }>({})
  const timeoutIdRef = useRef<number | undefined>(undefined)
  const workerStatusRef = useRef<WebWorkerStatus>('PENDING')

  const workerTerminate = useCallback((status: WebWorkerStatus = 'PENDING') => {
    const current = workerRef.current
    const win = windowRef.current
    if (current && current._url && win) {
      current.terminate()
      URL.revokeObjectURL(current._url)
      workerRef.current = undefined
      promiseRef.current = {}
      win.clearTimeout(timeoutIdRef.current)
      timeoutIdRef.current = undefined
      workerStatusRef.current = status
      setWorkerStatus(status)
    }
  }, [])

  const generateWorker = () => {
    const blobUrl = createWorkerBlobUrl(fnRef.current, dependenciesRef.current, localDependenciesRef.current)
    const newWorker: Worker & { _url?: string } = new Worker(blobUrl)
    newWorker._url = blobUrl

    newWorker.onmessage = (e: MessageEvent) => {
      const { resolve = () => { }, reject = () => { } } = promiseRef.current
      const [status, result] = e.data as [WebWorkerStatus, ReturnType<T>]

      switch (status) {
        case 'SUCCESS':
          resolve(result)
          workerTerminate(status)
          break
        default:
          reject(result)
          workerTerminate('ERROR')
          break
      }
    }

    newWorker.onerror = (e: ErrorEvent) => {
      const { reject = () => { } } = promiseRef.current
      e.preventDefault()
      reject(e)
      workerTerminate('ERROR')
    }

    if (timeoutRef.current) {
      const win = windowRef.current
      if (win)
        timeoutIdRef.current = win.setTimeout(() => workerTerminate('TIMEOUT_EXPIRED'), timeoutRef.current)
    }
    return newWorker
  }

  const callWorker = (...fnArgs: Parameters<T>) => new Promise<ReturnType<T>>((resolve, reject) => {
    promiseRef.current = {
      resolve,
      reject,
    }
    workerRef.current?.postMessage([[...fnArgs]])

    workerStatusRef.current = 'RUNNING'
    setWorkerStatus('RUNNING')
  })

  const workerFn = useCallback((...fnArgs: Parameters<T>): Promise<ReturnType<T>> => {
    if (workerStatusRef.current === 'RUNNING') {
      console.error(
        '[useWebWorkerFn] You can only run one instance of the worker at a time.',
      )
      /* eslint-disable-next-line prefer-promise-reject-errors */
      return Promise.reject()
    }

    if (!windowRef.current) {
      // SSR guard: without a `window` there is no `Worker`/`URL`/`Blob`.
      // Synchronous throw for parity with upstream, whose `workerFn` reaches
      // `new Worker` (via `createWorkerBlobUrl` → `new Blob`) and throws
      // there too.
      throw new Error('[useWebWorkerFn] no window: a Web Worker cannot be created.')
    }

    workerRef.current = generateWorker()
    return callWorker(...fnArgs)
  }, [])

  // upstream terminates the worker and revokes its blob URL when the scope
  // is disposed (`tryOnScopeDispose`)
  useEffect(() => () => {
    workerTerminate()
  }, [workerTerminate])

  return {
    workerFn,
    workerStatus,
    workerTerminate,
  }
}
