---
category: Browser
---

# useTitle

Reactive document title.

::: warning
This hook isn't compatible with SSR.
:::

## Usage

```tsx
import { useTitle } from '@reause/core'

const [title, setTitle] = useTitle()
console.log(title) // print current title
setTitle('Hello') // change current title
```

Set initial title immediately:

```tsx
import { useTitle } from '@reause/core'
// ---cut---
const [title] = useTitle('New Title')
```

Pass a value derived from state and the title will be updated when the source state changes:

```tsx
import { useTitle } from '@reause/core'
import { useState } from 'react'

const [messages, setMessages] = useState(0)

const title = !messages ? 'No message' : `${messages} new messages`

useTitle(title) // document title will match the state "title"
```

Pass an optional template tag [Vue Meta Title Template](https://vue-meta.nuxtjs.org/guide/metainfo.html) to update the title to be injected into this template:

```tsx
import { useTitle } from '@reause/core'
// ---cut---
const [title] = useTitle('New Title', {
  titleTemplate: '%s | My Awesome Website'
})
```

::: warning
`observe` is incompatible with `titleTemplate`.
:::

## Type Declarations

```ts
export interface UseTitleOptionsBase {
  /**
   * Specify a custom `document` instance, e.g. working with iframes or in testing environments.
   */
  document?: Document | null
  /**
   * Restore the original title when unmounted
   * @param originTitle original title
   * @returns restored title
   */
  restoreOnUnmount?:
    | false
    | ((
        originalTitle: string,
        currentTitle: string,
      ) => string | null | undefined)
}
/**
 * `observe` and `titleTemplate` are mutually exclusive (upstream union type).
 */
export type UseTitleOptions = UseTitleOptionsBase &
  (
    | {
        /**
         * Observe `document.title` changes using a MutationObserver. Cannot be used together with
         * `titleTemplate` option.
         *
         * @default false
         */
        observe?: boolean
      }
    | {
        /**
         * The template string to parse the title (e.g., '%s | My Website') Cannot be used together with
         * `observe` option.
         *
         * @default '%s'
         */
        titleTemplate?: string | ((title: string) => string)
      }
  )
export type UseTitleReturn = [
  title: string | null | undefined,
  setTitle: Dispatch<SetStateAction<string | null | undefined>>,
]
/**
 * Map from @vueuse/core `useTitle`
 * (`source/vueuse/packages/core/useTitle/`).
 *
 * @example
 * const [title, setTitle] = useTitle()
 * console.log(title) // print current title
 * setTitle('Hello') // change current title
 */
export declare function useTitle(
  newTitle?: string | null | undefined,
  options?: UseTitleOptions,
): UseTitleReturn
```
