---
category: Network
---

# useFetch

Reactive [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) provides the ability to abort requests, intercept requests before they are fired, automatically refetch requests when the url changes, and create your own `useFetch` with predefined options.

## Usage

### Basic Usage

The `useFetch` function can be used by simply providing a url. The url can be either a string or a
controllable state. The `data` value will contain the
result of the request, the `error` value will contain any errors, and the `isFetching`
value will indicate if the request is loading.

```ts
import { useFetch } from '@reause/core'

const { isFetching, error, data } = useFetch(url)
```

### Asynchronous Usage

`useFetch` can also be awaited just like a normal fetch:

```ts
import { useFetch } from '@reause/core'
// ---cut---
const { isFetching, error, data } = await useFetch(url)
```

### Refetching on URL change

Using a plain value for the url parameter (e.g. driven by `useState`) will allow the
`useFetch` function to automatically trigger another request when the url changes.

```tsx
import { useFetch } from '@reause/core'
import { useState } from 'react'

const [url, setUrl] = useState('https://my-api.com/user/1')

const { data } = useFetch(url, { refetch: true })

setUrl('https://my-api.com/user/2') // Will trigger another request
```

### Prevent request from firing immediately

Setting the `immediate` option to false will prevent the request from firing until the
`execute` function is called.

```ts
import { useFetch } from '@reause/core'
// ---cut---
const { execute } = useFetch(url, { immediate: false })

execute()
```

### Aborting a request

A request can be aborted by using the `abort` function from the `useFetch` function. The
`canAbort` property indicates if the request can be aborted.

```ts
import { useFetch } from '@reause/core'
// ---cut---
const { abort, canAbort } = useFetch(url)

setTimeout(() => {
  if (canAbort)
    abort()
}, 100)
```

A request can also be aborted automatically by using `timeout` property. It will call
`abort` function when the given timeout is reached.

```ts
import { useFetch } from '@reause/core'
// ---cut---
const { data } = useFetch(url, { timeout: 100 })
```

### Intercepting a request

The `beforeFetch` option can intercept a request before it is sent and modify the
request options and url.

```ts
import { useFetch } from '@reause/core'
// ---cut---
const { data } = useFetch(url, {
  async beforeFetch({ url, options, cancel }) {
    const myToken = await getMyToken()

    if (!myToken)
      cancel()

    options.headers = {
      ...options.headers,
      Authorization: `Bearer ${myToken}`,
    }

    return {
      options,
    }
  },
})
```

The `afterFetch` option can intercept the response data before it is updated.

```ts
import { useFetch } from '@reause/core'
// ---cut---
const { data } = useFetch(url, {
  afterFetch(ctx) {
    if (ctx.data.title === 'HxH')
      ctx.data.title = 'Hunter x Hunter' // Modifies the response data

    return ctx
  },
})
```

The `onFetchError` option can intercept the response data and error before it is updated
when `updateDataOnError` is set to `true`.

```ts
import { useFetch } from '@reause/core'
// ---cut---
const { data } = useFetch(url, {
  updateDataOnError: true,
  onFetchError(ctx) {
    // ctx.data can be null when 5xx response
    if (ctx.data === null)
      ctx.data = { title: 'Hunter x Hunter' } // Modifies the response data

    ctx.error = new Error('Custom Error') // Modifies the error
    return ctx
  },
})

console.log(data) // { title: 'Hunter x Hunter' }
```

### Setting the request method and return type

The request method and return type can be set by adding the appropriate methods to the
end of `useFetch`

```ts
import { useFetch } from '@reause/core'
// ---cut---
// Request will be sent with GET method and data will be parsed as JSON
const { data } = useFetch(url).get().json()

// Request will be sent with POST method and data will be parsed as text
const { data } = useFetch(url).post().text()

// Or set the method using the options

// Request will be sent with GET method and data will be parsed as blob
const { data } = useFetch(url, { method: 'GET' }, { refetch: true }).blob()
```

### Creating a Custom Instance

The `createFetch` function will return a useFetch function with whatever pre-configured
options that are provided to it. This is useful for interacting with API's throughout an
application that uses the same base URL or needs Authorization headers.

```ts
import { createFetch } from '@reause/core'
// ---cut---
const useMyFetch = createFetch({
  baseUrl: 'https://my-api.com',
  options: {
    async beforeFetch({ options }) {
      const myToken = await getMyToken()
      options.headers.Authorization = `Bearer ${myToken}`

      return { options }
    },
  },
  fetchOptions: {
    mode: 'cors',
  },
})

const { isFetching, error, data } = useMyFetch('users')
```

If you want to control the behavior of `beforeFetch`, `afterFetch`, `onFetchError`
between the pre-configured instance and newly spawned instance. You can provide a
`combination` option to toggle between `overwrite` or `chaining`.

```ts
import { createFetch } from '@reause/core'
// ---cut---
const useMyFetch = createFetch({
  baseUrl: 'https://my-api.com',
  combination: 'overwrite',
  options: {
    // beforeFetch in pre-configured instance will only run when the newly spawned instance do not pass beforeFetch
    async beforeFetch({ options }) {
      const myToken = await getMyToken()
      options.headers.Authorization = `Bearer ${myToken}`

      return { options }
    },
  },
})

// use useMyFetch beforeFetch
const { isFetching, error, data } = useMyFetch('users')

// use custom beforeFetch
const { isFetching, error, data } = useMyFetch('users', {
  async beforeFetch({ url, options, cancel }) {
    const myToken = await getMyToken()

    if (!myToken)
      cancel()

    options.headers = {
      ...options.headers,
      Authorization: `Bearer ${myToken}`,
    }

    return {
      options,
    }
  },
})
```

You can re-execute the request by calling the `execute` method in `afterFetch` or `onFetchError`. Here is a simple example of refreshing a token:

```ts
import { createFetch } from '@reause/core'
// ---cut---
let isRefreshing = false
const refreshSubscribers: Array<() => void> = []

const useMyFetch = createFetch({
  baseUrl: 'https://my-api.com',
  options: {
    async beforeFetch({ options }) {
      const myToken = await getMyToken()
      options.headers.Authorization = `Bearer ${myToken}`

      return { options }
    },
    afterFetch({ data, response, context, execute }) {
      if (needRefreshToken) {
        if (!isRefreshing) {
          isRefreshing = true
          refreshToken().then((newToken) => {
            if (newToken) {
              isRefreshing = false
              setMyToken(newToken)
              onRefreshed()
            }
            else {
              refreshSubscribers.length = 0
              // handle refresh token error
            }
          })
        }

        return new Promise((resolve) => {
          addRefreshSubscriber(() => {
            execute().then((response) => {
              resolve({ data, response })
            })
          })
        })
      }

      return { data, response }
    },
    // or use onFetchError with updateDataOnError
    updateDataOnError: true,
    onFetchError({ error, data, response, context, execute }) {
      // same as afterFetch
      return { error, data }
    },
  },
  fetchOptions: {
    mode: 'cors',
  },
})

async function refreshToken() {
  const { data, execute } = useFetch<string>('refresh-token', {
    immediate: false,
  })

  await execute()
  return data
}

function onRefreshed() {
  refreshSubscribers.forEach(callback => callback())
  refreshSubscribers.length = 0
}

function addRefreshSubscriber(callback: () => void) {
  refreshSubscribers.push(callback)
}

const { isFetching, error, data } = useMyFetch('users')
```

### Events

The `onFetchResponse` and `onFetchError` will fire on fetch request responses and errors
respectively.

```ts
import { useFetch } from '@reause/core'
// ---cut---
const { onFetchResponse, onFetchError } = useFetch(url)

onFetchResponse((response) => {
  console.log(response.status)
})

onFetchError((error) => {
  console.error(error.message)
})
```

## Type Declarations

```ts
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
  get: () => UseFetchReturn<T> & PromiseLike<UseFetchReturn<T>>
  post: (
    payload?: unknown,
    type?: string,
  ) => UseFetchReturn<T> & PromiseLike<UseFetchReturn<T>>
  put: (
    payload?: unknown,
    type?: string,
  ) => UseFetchReturn<T> & PromiseLike<UseFetchReturn<T>>
  delete: (
    payload?: unknown,
    type?: string,
  ) => UseFetchReturn<T> & PromiseLike<UseFetchReturn<T>>
  patch: (
    payload?: unknown,
    type?: string,
  ) => UseFetchReturn<T> & PromiseLike<UseFetchReturn<T>>
  head: (
    payload?: unknown,
    type?: string,
  ) => UseFetchReturn<T> & PromiseLike<UseFetchReturn<T>>
  options: (
    payload?: unknown,
    type?: string,
  ) => UseFetchReturn<T> & PromiseLike<UseFetchReturn<T>>
  json: <JSON = any>() => UseFetchReturn<JSON> &
    PromiseLike<UseFetchReturn<JSON>>
  text: () => UseFetchReturn<string> & PromiseLike<UseFetchReturn<string>>
  blob: () => UseFetchReturn<Blob> & PromiseLike<UseFetchReturn<Blob>>
  arrayBuffer: () => UseFetchReturn<ArrayBuffer> &
    PromiseLike<UseFetchReturn<ArrayBuffer>>
  formData: () => UseFetchReturn<FormData> &
    PromiseLike<UseFetchReturn<FormData>>
}
type Combination = "overwrite" | "chain"
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
  beforeFetch?: (
    ctx: BeforeFetchContext,
  ) =>
    | Promise<Partial<BeforeFetchContext> | void>
    | Partial<BeforeFetchContext>
    | void
  /**
   * Will run immediately after the fetch request is returned. Runs after any 2xx response
   */
  afterFetch?: (
    ctx: AfterFetchContext,
  ) => Promise<Partial<AfterFetchContext>> | Partial<AfterFetchContext>
  /**
   * Will run immediately after the fetch request is returned. Runs after any 4xx and 5xx response
   */
  onFetchError?: (
    ctx: OnFetchErrorContext,
  ) => Promise<Partial<OnFetchErrorContext>> | Partial<OnFetchErrorContext>
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
export declare function createFetch(
  config?: CreateFetchOptions,
): typeof useFetch
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
export declare function useFetch<T>(
  url: string,
): UseFetchReturn<T> & PromiseLike<UseFetchReturn<T>>
export declare function useFetch<T>(
  url: string,
  useFetchOptions: UseFetchOptions,
): UseFetchReturn<T> & PromiseLike<UseFetchReturn<T>>
export declare function useFetch<T>(
  url: string,
  options: RequestInit,
  useFetchOptions?: UseFetchOptions,
): UseFetchReturn<T> & PromiseLike<UseFetchReturn<T>>
```
