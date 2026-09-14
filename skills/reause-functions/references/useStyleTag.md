---
category: Browser
---

# useStyleTag

Inject reactive `style` element in head.

## Usage

### Basic usage

Provide a CSS string, then `useStyleTag` will automatically generate an id and inject it in `<head>`.

```tsx
import { useStyleTag } from '@reause/core'

const [css, setCss, { id, load, unload, isLoaded }] = useStyleTag('.foo { margin-top: 32px; }')

// Later you can modify styles
setCss('.foo { margin-top: 64px; }')
```

This code will be injected to `<head>`:

```html
<style id="reause_styletag_1">
  .foo {
    margin-top: 64px;
  }
</style>
```

### Custom ID

If you need to define your own id, you can pass `id` as first argument.

```tsx
import { useStyleTag } from '@reause/core'
// ---cut---
useStyleTag('.foo { margin-top: 32px; }', { id: 'custom-id' })
```

```html
<!-- injected to <head> -->
<style id="custom-id">
  .foo {
    margin-top: 32px;
  }
</style>
```

### Media query

You can pass media attributes as last argument within object.

```tsx
import { useStyleTag } from '@reause/core'
// ---cut---
useStyleTag('.foo { margin-top: 32px; }', { media: 'print' })
```

```html
<!-- injected to <head> -->
<style id="reause_styletag_1" media="print">
  .foo {
    margin-top: 32px;
  }
</style>
```

## Return Values

- `css` — the current CSS text of the style tag (plain state, seeded by the initial argument).
- `setCss(next | prev => next)` — replaces the CSS text: updates the injected `<style>` while loaded, and
  is stored for the next `load()` otherwise.
- `controls.id` — the DOM id of the style tag.
- `controls.load()` — inject the style tag into `document.head` (no-op when already loaded).
- `controls.unload()` — remove the style tag from `document.head` (reference-counted, so style tags
  shared by id are only removed with the last unloaded instance).
- `controls.isLoaded` — whether the style tag is currently injected.

The return is a React tuple `[css, setCss, { id, load, unload, isLoaded }]` — upstream returns an object
`{ id, css: ShallowRef<string>, load, unload, isLoaded }`, where `css` is a writable ref.

## Type Declarations

```ts
export interface UseStyleTagOptions {
  /**
   * Media query for styles to apply
   */
  media?: string
  /**
   * Load the style immediately
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
   * DOM id of the style tag
   *
   * @default auto-incremented (`reause_styletag_N`)
   */
  id?: string
  /**
   * Nonce value for CSP (Content Security Policy)
   *
   * @default undefined
   */
  nonce?: string
  /**
   * Specify a custom `document` instance, e.g. working with iframes or in testing environments.
   */
  document?: Document
}
export type UseStyleTagReturn = readonly [
  /**
   * Current CSS text of the style tag — React state seeded by the initial `css` argument.
   */
  css: string,
  /**
   * Update the CSS text of the style tag — `setCss('...')` or `setCss(prev => '...')`. Updates the
   * live `<style>` element while loaded, and is stored for the next `load()` otherwise. Upstream:
   * `css.value = '...'`.
   */
  setCss: Dispatch<SetStateAction<string>>,
  controls: {
    /**
     * DOM id of the style tag
     */
    id: string
    /**
     * Inject the style tag into `document.head` (no-op when already loaded)
     */
    load: () => void
    /**
     * Remove the style tag from `document.head` (reference-counted, so style tags shared by id are
     * only removed with the last unloaded instance)
     */
    unload: () => void
    /**
     * Whether the style tag is currently injected
     */
    isLoaded: boolean
  },
]
/**
 * Map from @vueuse/core `useStyleTag`
 * (`source/vueuse/packages/core/useStyleTag/`).
 *
 * @example
 * const [css, setCss, { id, load, unload, isLoaded }] = useStyleTag('.foo { margin-top: 32px; }')
 * setCss('.foo { margin-top: 64px; }') // updates the injected <style>
 * setCss(prev => `${prev}\n.foo { margin-top: 96px; }`) // functional update
 */
export declare function useStyleTag(
  css: string,
  options?: UseStyleTagOptions,
): UseStyleTagReturn
```
