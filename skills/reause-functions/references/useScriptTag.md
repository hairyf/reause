---
category: Browser
---

# useScriptTag

Creates a script tag

If a script tag already exists for the given URL, `useScriptTag()` will not create another script tag, but keep in mind that depending on how you use it, `useScriptTag()` might have already loaded then unloaded that particular JS file from a previous call of `useScriptTag()`.

## Usage

```tsx
import { useScriptTag } from '@reause/core'

const { scriptTag, load, unload } = useScriptTag(
  'https://player.twitch.tv/js/embed/v1.js',
  // on script tag loaded.
  (el: HTMLScriptElement) => {
    // do something
  },
)
```

The script will be automatically loaded when the component is mounted and removed when the component is unmounted.

## Configuration

Set `manual: true` to have manual control over the timing to load the script:

```tsx
const { scriptTag, load, unload } = useScriptTag(
  'https://player.twitch.tv/js/embed/v1.js',
  () => {
    // do something
  },
  { manual: true },
)

// manual controls
await load()
await unload()
```

## Type Declarations

```ts
/**
 * Options for `useScriptTag`.
 */
export interface UseScriptTagOptions {
  /**
   * Load the script immediately
   *
   * @default true
   */
  immediate?: boolean
  /**
   * Manual controls the timing of loading and unloading
   *
   * @default false
   */
  manual?: boolean
  /**
   * Add `async` attribute to the script tag
   *
   * @default true
   */
  async?: boolean
  /**
   * Script type
   *
   * @default 'text/javascript'
   */
  type?: string
  crossOrigin?: "anonymous" | "use-credentials"
  referrerPolicy?:
    | "no-referrer"
    | "no-referrer-when-downgrade"
    | "origin"
    | "origin-when-cross-origin"
    | "same-origin"
    | "strict-origin"
    | "strict-origin-when-cross-origin"
    | "unsafe-url"
  noModule?: boolean
  defer?: boolean
  /**
   * Add custom attribute to the script tag
   */
  attrs?: Record<string, string>
  /**
   * Nonce value for CSP (Content Security Policy)
   *
   * @default undefined
   */
  nonce?: string
  /**
   * Custom `document` instance (upstream folds this option into
   * `ConfigurableDocument`). Resolved lazily at load time and defaults to the
   * global `document`, so importing and rendering on the server is safe.
   */
  document?: Document
}
/**
 * Return type of `useScriptTag`.
 */
export interface UseScriptTagReturn {
  /**
   * The script element once a load has been requested (and settled for
   * `load()`), `null` before that and again after `unload`.
   */
  scriptTag: HTMLScriptElement | null
  /**
   * Load the script specified via `src`. Repeated calls share the same
   * in-flight promise instead of creating a second script tag.
   *
   * @param waitForScriptLoad Whether if the Promise should resolve once the "load" event is emitted by the <script> attribute, or right after appending it to the DOM.
   * @returns Promise<HTMLScriptElement | boolean>
   */
  load: (waitForScriptLoad?: boolean) => Promise<HTMLScriptElement | boolean>
  /**
   * Unload the script specified by `src`.
   */
  unload: () => void
}
/**
 * React port of VueUse's `useScriptTag`.
 *
 * Map from @vueuse/core `useScriptTag`
 * (`source/vueuse/packages/core/useScriptTag/`). Async script tag loading —
 * appends a `<script>` element for `src` to `document.head` (reusing an
 * existing tag for the same `src`), and can remove the tag again. By default
 * the script loads on mount and unloads on unmount.
 *
 * React divergences:
 * - `src` is a plain string (upstream `MaybeRefOrGetter<string>`);
 * - the `scriptTag` shallowRef becomes plain state — a
 *   `HTMLScriptElement | null` value that stays `null` during render, so no
 *   document access happens while rendering (SSR-safe);
 * - `src`, `onLoaded` and options are read through latest-value refs, so the
 *   returned `load`/`unload` are stable callbacks;
 * - the mount auto-load and unmount auto-unload run in one `useEffect`
 *   (upstream `tryOnMounted`/`tryOnUnmounted`), and the script's
 *   `error`/`abort`/`load` listeners are detached on unmount (upstream
 *   delegates that to `useEventListener`'s scope disposal);
 * - the upstream `ConfigurableDocument` option is inlined as `document?` on
 *   `UseScriptTagOptions`.
 *
 * @example
 * const { scriptTag, load, unload } = useScriptTag(
 *   'https://player.twitch.tv/js/embed/v1.js',
 *   (el: HTMLScriptElement) => {
 *     // do something
 *   },
 * )
 */
export declare function useScriptTag(
  src: string,
  onLoaded?: (el: HTMLScriptElement) => void,
  options?: UseScriptTagOptions,
): UseScriptTagReturn
```
