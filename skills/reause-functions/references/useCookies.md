---
category: '@Integrations'
---

# useCookies

Wrapper for [`universal-cookie`](https://www.npmjs.com/package/universal-cookie).

## Install

```bash
npm i universal-cookie@^8
```

## Usage

### Common usage

```tsx
import { useCookies } from '@reause/integrations'

function Component() {
  const cookies = useCookies(['locale'])

  return (
    <div>
      <strong>locale</strong>
      :
      {cookies.get('locale')}
      <hr />
      <pre>{JSON.stringify(cookies.getAll())}</pre>
      <button onClick={() => cookies.set('locale', 'ru-RU')}>
        Russian
      </button>
      <button onClick={() => cookies.set('locale', 'en-US')}>
        English
      </button>
    </div>
  )
}
```

## Options

Access and modify cookies using React hooks.

```tsx
import { useCookies } from '@reause/integrations'

const {
  get,
  getAll,
  set,
  remove,
  addChangeListener,
  removeChangeListener,
} = useCookies(['cookie-name'], {
  doNotParse: false,
  autoUpdateDependencies: false,
})
```

### `dependencies` (optional)

Let you optionally specify a list of cookie names your component depend on or that should trigger a
re-render. If unspecified, it will render on every cookie change.

### `options` (optional)

- `doNotParse` (boolean = false): do not convert the cookie into an object no matter what. **Passed as default value to `get`/`getAll` methods.**
- `autoUpdateDependencies` (boolean = false): automatically add cookie names ever provided to `get` method. If **true** then you don't need to care about provided `dependencies`.

### `cookies` (optional)

Let you provide a `universal-cookie` instance (creates a new instance by default)

> Info about methods available in the [universal-cookie api docs](https://www.npmjs.com/package/universal-cookie#api---cookies-class)

## `createCookies([req])`

Create a `universal-cookie` instance using request (default is `window.document.cookie`) and returns `useCookies` function with provided universal-cookie instance

- req (object): Node's [http.IncomingMessage](https://nodejs.org/api/http.html#http_class_http_incomingmessage) request object

```ts
import { createCookies } from '@reause/integrations'

const useSsrCookies = createCookies({ headers: { cookie: 'locale=en-US' } })
const { get } = useSsrCookies(['locale'])
get('locale') // 'en-US'
```

## Type Declarations

```ts
type CookieGetOptions = NonNullable<Parameters<Cookie["get"]>[1]>
type CookieSetOptions = NonNullable<Parameters<Cookie["set"]>[2]>
type CookieValue = Parameters<Cookie["set"]>[1]
type CookieChangeListener = Parameters<Cookie["addChangeListener"]>[0]
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
 * Deviation from upstream: VueUse types this parameter as Node's `IncomingMessage` (``), which would pull the Node built-in into a browser bundle.
 * Only `headers.cookie` is actually read, so the port declares that shape itself and keeps the
 * browser build free of any `node:` import.
 */
export interface CreateCookiesRequest {
  headers?: {
    cookie?: string | null
  }
}
/**
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
export declare function createCookies(
  req?: CreateCookiesRequest | string,
): (
  dependencies?: string[] | null,
  options?: UseCookiesOptions,
) => UseCookiesReturn
/**
 * Map from @vueuse/integrations `useCookies`
 * (`source/vueuse/packages/integrations/useCookies/index.ts`).
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
export declare function useCookies(
  dependencies?: string[] | null,
  { doNotParse, autoUpdateDependencies }?: UseCookiesOptions,
  cookies?: Cookie,
): UseCookiesReturn
```
