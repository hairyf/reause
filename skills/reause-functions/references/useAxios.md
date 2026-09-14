---
category: '@Integrations'
---

# useAxios

Wrapper for [`axios`](https://github.com/axios/axios)

## Install

```bash
npm i axios@^1
```

## Usage

```tsx
import { useAxios } from '@reause/integrations'

const { data, isFinished } = useAxios('/api/posts')
```

### Return Values

| Property           | Type                            | Description                                                     |
| ------------------ | ------------------------------- | --------------------------------------------------------------- |
| `data`             | `T` / `T \| undefined`          | Response data (`T` with `initialData`)                          |
| `response`         | `AxiosResponse<T> \| undefined` | Full axios response                                             |
| `error`            | `unknown \| undefined`          | Error if request failed                                         |
| `isFinished`       | `boolean`                       | Request has completed (success or error)                        |
| `isLoading`        | `boolean`                       | Request is in progress                                          |
| `isAborted`        | `boolean`                       | Request was aborted                                             |
| `abort` / `cancel` | `(message?: string) => void`    | Abort the current request                                       |
| `execute`          | `(url?, config?) => Promise`    | Execute/re-execute the request (resolves with the return shell) |

### With Axios Instance

```tsx
import { useAxios } from '@reause/integrations'
import axios from 'axios'

const instance = axios.create({
  baseURL: '/api',
})

const { data, isFinished } = useAxios('/posts', instance)
```

### With Config Options

```tsx
import { useAxios } from '@reause/integrations'
import axios from 'axios'

const instance = axios.create({
  baseURL: '/api',
})

const { data, isFinished } = useAxios('/posts', { method: 'POST' }, instance)
```

### Manual Execution

When you don't pass a `url`, the request won't fire immediately:

```tsx
import { useAxios } from '@reause/integrations'

const { execute } = useAxios()
execute(url)
```

The `execute` function `url` is optional - `url2` will replace `url1`:

```tsx
import { useAxios } from '@reause/integrations'

const { execute } = useAxios(url1, {}, { immediate: false })
execute(url2)
```

The `execute` function can accept config only:

```tsx
import { useAxios } from '@reause/integrations'

const { execute } = useAxios(url1, { method: 'GET' }, { immediate: false })
execute({ params: { key: 1 } })
execute({ params: { key: 2 } })
```

### Awaiting Results

The return value is thenable, so you can await it:

```tsx
import { useAxios } from '@reause/integrations'

const { data, isFinished, error, execute } = useAxios('/api/posts')

// await a re-execution — resolves with the shell once the request settled
const snapshot = await execute()
// data is now populated
```

Or await the `execute` function:

```tsx
import { useAxios } from '@reause/integrations'

const { execute } = useAxios()
const result = await execute(url)
```

### Options

```tsx
const { data } = useAxios('/api/posts', config, instance, {
  // Execute immediately (default: true if url provided)
  immediate: true,
  // Use shallowRef for data (default: true)
  shallow: true,
  // Abort previous request on new execute (default: true)
  abortPrevious: true,
  // Reset data before executing (default: false)
  resetOnExecute: false,
  // Initial data value
  initialData: [],
  // Callbacks
  onSuccess: data => console.log('Success:', data),
  onError: error => console.error('Error:', error),
  onFinish: () => console.log('Finished'),
})
```

## Type Declarations

```ts
export interface UseAxiosReturn<
  T,
  R = AxiosResponse<T>,
  _D = any,
  O extends UseAxiosOptions = UseAxiosOptions<T>,
> {
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
export interface StrictUseAxiosReturn<
  T,
  R,
  D,
  O extends UseAxiosOptions = UseAxiosOptions<T>,
> extends UseAxiosReturn<T, R, D, O> {
  /**
   * Manually call the axios request — returns the shared thenable shell (upstream `return
   * promise`): `await execute()` resolves with the shell once the request finished, rejecting with
   * the request error on failure; a bare unawaited call never settles eagerly, so it cannot produce
   * an unhandled rejection.
   */
  execute: (
    url?: string | AxiosRequestConfig<D>,
    config?: AxiosRequestConfig<D>,
  ) => Promise<StrictUseAxiosReturn<T, R, D, O>>
}
export interface EasyUseAxiosReturn<T, R, D> extends UseAxiosReturn<T, R, D> {
  /**
   * Manually call the axios request — returns the shared thenable shell (upstream `return
   * promise`): `await execute(url)` resolves with the shell once the request finished, rejecting
   * with the request error on failure; a bare unawaited call never settles eagerly, so it cannot
   * produce an unhandled rejection.
   */
  execute: (
    url: string,
    config?: AxiosRequestConfig<D>,
  ) => Promise<EasyUseAxiosReturn<T, R, D>>
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
export interface UseAxiosOptionsWithInitialData<
  T,
> extends UseAxiosOptionsBase<T> {
  /**
   * Initial data
   */
  initialData: T
}
export type UseAxiosOptions<T = any> =
  UseAxiosOptionsBase<T> | UseAxiosOptionsWithInitialData<T>
export declare function useAxios<
  T = any,
  R = AxiosResponse<T>,
  D = any,
  O extends UseAxiosOptionsWithInitialData<T> =
    UseAxiosOptionsWithInitialData<T>,
>(
  url: string,
  config?: AxiosRequestConfig<D>,
  options?: O,
): StrictUseAxiosReturn<T, R, D, O> &
  UseAxiosThenable<StrictUseAxiosReturn<T, R, D, O>>
export declare function useAxios<
  T = any,
  R = AxiosResponse<T>,
  D = any,
  O extends UseAxiosOptionsWithInitialData<T> =
    UseAxiosOptionsWithInitialData<T>,
>(
  url: string,
  instance?: AxiosInstance,
  options?: O,
): StrictUseAxiosReturn<T, R, D, O> &
  UseAxiosThenable<StrictUseAxiosReturn<T, R, D, O>>
export declare function useAxios<
  T = any,
  R = AxiosResponse<T>,
  D = any,
  O extends UseAxiosOptionsWithInitialData<T> =
    UseAxiosOptionsWithInitialData<T>,
>(
  url: string,
  config: AxiosRequestConfig<D>,
  instance: AxiosInstance,
  options?: O,
): StrictUseAxiosReturn<T, R, D, O> &
  UseAxiosThenable<StrictUseAxiosReturn<T, R, D, O>>
export declare function useAxios<
  T = any,
  R = AxiosResponse<T>,
  D = any,
  O extends UseAxiosOptionsBase<T> = UseAxiosOptionsBase<T>,
>(
  url: string,
  config?: AxiosRequestConfig<D>,
  options?: O,
): StrictUseAxiosReturn<T, R, D, O> &
  UseAxiosThenable<StrictUseAxiosReturn<T, R, D, O>>
export declare function useAxios<
  T = any,
  R = AxiosResponse<T>,
  D = any,
  O extends UseAxiosOptionsBase<T> = UseAxiosOptionsBase<T>,
>(
  url: string,
  instance?: AxiosInstance,
  options?: O,
): StrictUseAxiosReturn<T, R, D, O> &
  UseAxiosThenable<StrictUseAxiosReturn<T, R, D, O>>
export declare function useAxios<
  T = any,
  R = AxiosResponse<T>,
  D = any,
  O extends UseAxiosOptionsBase<T> = UseAxiosOptionsBase<T>,
>(
  url: string,
  config: AxiosRequestConfig<D>,
  instance: AxiosInstance,
  options?: O,
): StrictUseAxiosReturn<T, R, D, O> &
  UseAxiosThenable<StrictUseAxiosReturn<T, R, D, O>>
export declare function useAxios<T = any, R = AxiosResponse<T>, D = any>(
  config?: AxiosRequestConfig<D>,
): EasyUseAxiosReturn<T, R, D> & UseAxiosThenable<EasyUseAxiosReturn<T, R, D>>
export declare function useAxios<T = any, R = AxiosResponse<T>, D = any>(
  instance?: AxiosInstance,
): EasyUseAxiosReturn<T, R, D> & UseAxiosThenable<EasyUseAxiosReturn<T, R, D>>
export declare function useAxios<T = any, R = AxiosResponse<T>, D = any>(
  config?: AxiosRequestConfig<D>,
  instance?: AxiosInstance,
): EasyUseAxiosReturn<T, R, D> & UseAxiosThenable<EasyUseAxiosReturn<T, R, D>>
```
