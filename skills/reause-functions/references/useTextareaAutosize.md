---
category: Browser
---

# useTextareaAutosize

Automatically update the height of a textarea depending on the content.

> [!TIP]
> You may not need this function anymore. Textarea autosizing can now be achieved natively with CSS, see [`field-sizing: content`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/field-sizing) for more information.

## Usage

### Simple example

```tsx
import { useTextareaAutosize } from '@reause/core'

const { input, setInput, textarea } = useTextareaAutosize()
// <textarea ref={textarea} value={input} onChange={e => setInput(e.target.value)} />
```

::: info

It's recommended to reset the scrollbar styles for the textarea element to avoid incorrect height values for large amounts of text.

```css
textarea {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

textarea::-webkit-scrollbar {
  display: none;
}
```

:::

### With `rows` attribute

If you need support for the rows attribute on a textarea element, then you should set the `styleProp` option to `minHeight`.

```tsx
import { useTextareaAutosize } from '@reause/core'

const { input, setInput, textarea } = useTextareaAutosize({ styleProp: 'minHeight' })
// <textarea ref={textarea} value={input} onChange={e => setInput(e.target.value)} rows={3} />
```

### With `maxHeight`

Use the `maxHeight` option to cap the textarea height in pixels while keeping autosize behavior.

```tsx
import { useTextareaAutosize } from '@reause/core'

const { input, setInput, textarea } = useTextareaAutosize({
  maxHeight: 180,
  styleProp: 'minHeight',
})
// <textarea ref={textarea} value={input} onChange={e => setInput(e.target.value)} rows={3} />
```

## Return Values

`useTextareaAutosize` returns the object `{ input, setInput, textarea, triggerResize }`:

| Property        | Type                                     | Description                                                                                                                        |
| --------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `input`         | `string`                                 | Current textarea content — the `input` option when provided, otherwise the hook-owned state.                                       |
| `setInput`      | `Dispatch<SetStateAction<string>>`       | Updates the hook-owned content (upstream: writing `input.value`). Has no effect on the resize while an `input` option is provided. |
| `textarea`      | `RefObject<HTMLTextAreaElement \| null>` | Bind it to the `<textarea>` with `ref={textarea}` when the `element` option is omitted (upstream: the `textarea` ref).             |
| `triggerResize` | `() => void`                             | Manually trigger a textarea resize (upstream: `triggerResize`).                                                                    |

## React divergence from upstream

Upstream returns `{ textarea: Ref<HTMLTextAreaElement | undefined | null>, input: Ref<string>, triggerResize }`,
so consumers read and write `input.value`. This port mirrors that object and pairs the writable content
with a setter — `{ input, setInput, textarea, triggerResize }`.

The `element` and `styleTarget` options accept a React ref (`RefObject` holding the element), and the
textarea is resolved at commit time, so an element attached after mount
(conditional or async render) still triggers the resize and the `ResizeObserver`. The `watch` values
are compared with the shared structural `deepEqual` (functions by reference; `Map` / `Set` / `Date` /
`RegExp` by contents) instead of a `JSON.stringify` key, so non-serializable values re-trigger the
resize. Upstream's two mount watches are merged into one commit-time effect, so the mount resize runs
once instead of twice.

## Type Declarations

```ts
/**
 * Options for `useTextareaAutosize`.
 */
export interface UseTextareaAutosizeOptions {
  /**
   * Specify a custom `window` instance, e.g. working with iframes or in
   * testing environments.
   */
  window?: Window
  /**
   * Textarea element to autosize — a plain element or a ref-like `{ current }`
   * object. When omitted, bind the returned `textarea` ref instead.
   */
  element?: RefObject<HTMLTextAreaElement | null | undefined>
  /**
   * Textarea content. When omitted, the hook owns the content state and you
   * update it through the returned `setInput`.
   */
  input?: string
  /** Maximum autosized height in pixels. */
  maxHeight?: number
  /**
   * Values that should trigger a textarea resize when they change — the React
   * mapping of upstream's `watch` sources. Compared structurally with the
   * shared `deepEqual` (functions by reference; `Map` / `Set` / `Date` /
   * `RegExp` by contents), so non-serializable values are supported. The
   * resize also fires once on mount (upstream `immediate: true`).
   */
  watch?: unknown[]
  /** Function called when the textarea size changes. */
  onResize?: () => void
  /**
   * Specify style target to apply the height based on textarea content — a
   * plain element or a ref-like `{ current }` object. If not provided it will
   * use textarea itself.
   */
  styleTarget?: RefObject<HTMLElement | null | undefined>
  /**
   * Specify the style property that will be used to manipulate height. Can be
   * `height | minHeight`. Default value is `height`.
   */
  styleProp?: "height" | "minHeight"
}
export interface UseTextareaAutosizeReturn {
  /**
   * Current textarea content — the `input` option when provided, otherwise the
   * hook-owned state.
   */
  readonly input: string
  /**
   * Content setter for the hook-owned state — the React mapping of upstream's
   * writable `input` ref. Has no effect on the resize while an `input` option
   * is provided.
   */
  readonly setInput: Dispatch<SetStateAction<string>>
  /**
   * Ref to bind to the `<textarea>` — the `element` option when it is a
   * ref-like object, otherwise a hook-owned ref.
   */
  readonly textarea: RefObject<HTMLTextAreaElement | null>
  /** Manually trigger a textarea resize. */
  readonly triggerResize: () => void
}
/**
 * React port of VueUse's `useTextareaAutosize`.
 *
 * Map from @vueuse/core `useTextareaAutosize`
 * (`source/vueuse/packages/core/useTextareaAutosize/`) — automatically update
 * the height of a textarea depending on the content.
 *
 * React divergences:
 * - upstream returns `{ textarea, input, triggerResize }` with writable refs;
 *   this port returns the object `{ input, setInput, textarea, triggerResize }`
 *   — the content is a plain value paired with the `setInput` setter (the React
 *   mapping of upstream's writable `input` ref), and `textarea` stays an
 *   element ref;
 * - the `element` and `styleTarget` options accept a plain element or a
 *   ref-like `{ current }` object (`MaybeRefOrGetter`). The textarea is resolved at
 *   commit time, so an element attached after mount (conditional or async
 *   render) still triggers the resize and the `ResizeObserver`;
 * - upstream's `watch([input, textarea], () => nextTick(triggerResize), {
 *   immediate: true })` and `watch(options.watch, triggerResize, { immediate:
 *   true, deep: true })` become one commit-time effect that resizes on mount
 *   and whenever the resolved element, the content or the `watch` values
 *   change — the mount resize therefore runs once, not twice;
 * - the `watch` values are compared with the shared structural `deepEqual`
 *   (functions by reference; `Map` / `Set` / `Date` / `RegExp` by contents)
 *   instead of a `JSON.stringify` key, so non-serializable values re-trigger;
 * - upstream's `useResizeObserver` composition becomes a self-contained
 *   `ResizeObserver` effect that re-measures when the element's width changes
 *   and is disconnected on unmount.
 *
 * @example
 * const { input, setInput, textarea } = useTextareaAutosize()
 * // <textarea ref={textarea} value={input} onChange={e => setInput(e.target.value)} />
 */
export declare function useTextareaAutosize(
  options?: UseTextareaAutosizeOptions,
): UseTextareaAutosizeReturn
```
