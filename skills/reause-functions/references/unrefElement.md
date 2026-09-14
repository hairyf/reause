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
 * Return type of `unrefElement`. Upstream keeps the Vue component-instance branch (`T extends
 * VueInstance ? Exclude<MaybeElement, VueInstance>: T | undefined`); React refs hold DOM nodes
 * directly, so it simply resolves to `T | undefined`.
 */
export type UnRefElementReturn<T> = T | undefined
/**
 * Map from @vueuse/core `unrefElement`
 * (`source/vueuse/packages/core/unrefElement/`).
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
