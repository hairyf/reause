---
category: Sensors
---

# useStartTyping

Fires when users start typing on non-editable elements. Useful for auto-focusing an input field when the user starts typing anywhere on the page.

## Usage

```tsx
import { useStartTyping } from '@reause/core'
import { useRef } from 'react'

const input = useRef<HTMLInputElement>(null)

useStartTyping(() => {
  if (input.current !== document.activeElement)
    input.current?.focus()
})

// <input ref={input} type="text" placeholder="Start typing to focus">
```

## Custom Valid Key

```ts
import { useStartTyping } from '@reause/core'

useStartTyping(handleKey, {
  // only allow numbers
  isTypedCharValid: e => /^\d$/.test(e.key),
})
```

## Custom Editable Element

```ts
import { isFocusedElementEditable as defaultEditable, useStartTyping } from '@reause/core'

useStartTyping(handleKey, {
  isFocusedElementEditable: () => {
    const { activeElement } = document

    // Exclude elements with id 'targetInput'
    if (activeElement?.id === 'targetInput')
      return true

    return defaultEditable()
  },
})
```

## How It Works

The callback only fires when:

- No editable element (`<input>`, `<textarea>`, or `contenteditable`) is focused
- The pressed key is alphanumeric (A-Z, 0-9)
- No modifier keys (Ctrl, Alt, Meta) are held

This allows users to start typing anywhere on the page without accidentally triggering the callback when using keyboard shortcuts or interacting with form fields.

Both `isFocusedElementEditable` and `isTypedCharValid` are also exported as utility functions, so you can reuse them when writing custom options.

## Type Declarations

```ts
/**
 * Check if the currently focused element is editable — `<input>`, `<textarea>` or a
 * `contenteditable` element.
 *
 * A single source of truth mirroring the upstream default (`onStartTyping`'s
 * `isFocusedElementEditable`), exported so it can be reused in custom `isFocusedElementEditable`
 * options.
 */
export declare function isFocusedElementEditable(): boolean
/**
 * Check whether the pressed key counts as a "typing" character — `A–Z`, `0–9` (main row and numpad)
 * without any Ctrl / Alt / Meta modifier held down. Bound to the legacy `keyCode` like upstream.
 *
 * Exported so it can be reused in custom `isTypedCharValid` options.
 */
export declare function isTypedCharValid({
  keyCode,
  metaKey,
  ctrlKey,
  altKey,
}: KeyboardEvent): boolean
/**
 * Options for `useStartTyping`.
 *
 * The upstream `ConfigurableDocument` is inlined as `document` here (see `useActiveElement` /
 * `useScriptTag` — `ConfigurableDocument` is not ported to `@reause/shared`).
 */
export interface UseStartTypingOptions {
  /**
   * Custom `document` instance to listen on, e.g. working with iframes or in testing environments.
   *
   * @default the global `document` on the client
   */
  document?: Document
  /**
   * Validate the pressed key before firing the callback.
   *
   * @default `isTypedCharValid`
   */
  isTypedCharValid?: (event: KeyboardEvent) => boolean
  /**
   * Decide whether the currently focused element counts as editable — the callback never fires
   * while such an element has focus.
   *
   * @default `isFocusedElementEditable`
   */
  isFocusedElementEditable?: () => boolean
}
/**
 * Map from @vueuse/core `onStartTyping`
 * (`source/vueuse/packages/core/onStartTyping/`).
 *
 * @example
 * const input = useRef<HTMLInputElement>(null)
 *
 * useStartTyping(() => {
 *   if (!input.current?.active)
 *     input.current?.focus()
 * })
 *
 * @see https://vueuse.org/onStartTyping
 * @param callback Fired when the user starts typing on a non-editable element.
 * @param options
 * @returns An unmount function that stops listening to typing events.
 */
export declare function useStartTyping(
  callback: (event: KeyboardEvent) => void,
  options?: UseStartTypingOptions,
): () => void
```
