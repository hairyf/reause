---
category: Browser
related: useWebWorkerFn
---

# useWebWorker

Simple [Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers) registration and communication

## Usage

```tsx
import { useWebWorker } from '@reause/core'

const { data, post, terminate, worker } = useWebWorker('/path/to/worker.js')
```

| State  | Type                  | Description                                                                            |
| ------ | --------------------- | -------------------------------------------------------------------------------------- |
| data   | `Data \| null`        | Latest data received via the worker (`e.data`), `null` until the first message arrives |
| worker | `Worker \| undefined` | The Web Worker instance, `undefined` until the mount effect created it                 |

| Method    | Signature                                                                                                                     | Description                      |
| --------- | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| post      | `(message: any, transfer: Transferable[]): void`<br>`(message: any, options?: StructuredSerializeOptions \| undefined): void` | Sends data to the worker thread. |
| terminate | `() => void`                                                                                                                  | Stops and terminates the worker. |

### Worker instance / factory overload

`useWebWorker` also accepts an existing `Worker` instance or a factory
function returning one, instead of a URL (upstream's second overload,
`useWebWorker(worker: Worker | WorkerFn)`):

```tsx
import { useWebWorker } from '@reause/core'

// adopt an existing instance (its `onmessage` is wired; terminated on unmount)
const external = new Worker('/path/to/worker.js')
const { data } = useWebWorker(external)

// or a factory function returning a Worker
const { data: factoryData } = useWebWorker(() => new Worker('/path/to/worker.js'))
```

An adopted instance is terminated when the component unmounts, including the
synthetic unmount of a React StrictMode remount cycle — prefer the
factory-function form when StrictMode is enabled.

### Window option

The optional third argument accepts a `window` option (defaults to the
global `window`) used as the creation guard, mirroring upstream's
`if (window)` check: a falsy `window` skips worker creation entirely, so SSR
renders `worker: undefined` and `post` becomes a no-op:

```tsx
const { worker } = useWebWorker('/path/to/worker.js', undefined, { window: null as unknown as Window })
```

## Type Declarations

```ts
type PostMessage = (typeof Worker.prototype)["postMessage"]
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
 * (`source/vueuse/packages/core/useWebWorker/`).
 *
 * @example
 * const { data, post, terminate, worker } = useWebWorker<string>('/path/to/worker.js')
 * post('hello') // the worker replies via self.postMessage(...)
 */
export declare function useWebWorker<T = any>(
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
export declare function useWebWorker<T = any>(
  worker: Worker | WorkerFn,
): UseWebWorkerReturn<T>
```
