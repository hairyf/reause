---
category: Component
---

# unrefElement

Get the DOM element a React ref object currently holds

## Usage

```tsx
import { unrefElement } from '@reause/core'
import { useEffect, useRef } from 'react'

const div = useRef<HTMLDivElement>(null)

useEffect(() => {
  console.log(unrefElement(div)) // the <div> element (div.current)
})
```

## React divergences

- **Refs only — no plain elements or getters.** Upstream accepts `MaybeRefOrGetter`, but reause binds
  DOM targets to React refs: the input is a `RefObject` and `unrefElement` resolves it to `.current`
  (`undefined` when empty). A plain element or a zero-argument getter is rejected at the type level —
  hold the element in a `useRef` instead.
- **Callback refs are not supported.** React's callback ref (`ref={(el) => { ... }}`) is a function and
  cannot be read synchronously, so the `RefCallback` arm is rejected at the type level too.
- **No Vue component instances.** React refs hold DOM nodes directly, so upstream's `$el` unwrap and
  the `VueInstance` members of `MaybeElement` have no equivalent here.

## Type Declarations

```ts
/**
 * Return type of `unrefElement`. Upstream keeps the Vue component-instance
 * branch (`T extends VueInstance ? Exclude<MaybeElement, VueInstance> : T | undefined`);
 * React refs hold DOM nodes directly, so it simply resolves to `T | undefined`.
 */
export type UnRefElementReturn<T> = T | undefined
/**
 * Get the DOM element a React ref object currently holds.
 *
 * Map from @vueuse/core `unrefElement`
 * (`source/vueuse/packages/core/unrefElement/`), which unwraps a Vue ref or
 * component instance to its underlying DOM element (`plain?.$el ?? plain`).
 *
 * React adaptation: there is no Vue component-instance analog in React — refs
 * already hold DOM nodes via `{ current }` — so the `$el` unwrap branch and the
 * `VueInstance` members of upstream's `MaybeElement` are omitted. Unlike
 * upstream's `MaybeRef` input, reause binds DOM targets to React refs only:
 * the input is a `RefObject` (never a plain element, a getter or a Vue ref),
 * and the function resolves it to `.current` (or `undefined` when empty).
 *
 * Callback refs are NOT supported: React's `RefCallback`
 * (`ref={(el) => { ... }}`) is a function and cannot be read synchronously.
 * `ElementTarget` therefore excludes the `RefCallback` arm; pass a `useRef`
 * object (`{ current }`) instead.
 *
 * @param elRef - React ref object (`{ current }`) holding the element;
 * callback refs are rejected at the type level
 * @example
 * const div = useRef<HTMLDivElement>(null)
 * div.current = document.querySelector<HTMLDivElement>('div')!
 * console.log(unrefElement(div)) // the <div> element (div.current)
 */
export declare function unrefElement<T>(
  elRef: RefObject<T | null | undefined>,
): UnRefElementReturn<T>
```
