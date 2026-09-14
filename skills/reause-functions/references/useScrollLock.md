---
category: Sensors
---

# useScrollLock

Lock scrolling of the element

## Usage

```tsx
import { useScrollLock } from '@reause/core'
import { useRef } from 'react'

const el = useRef<HTMLDivElement>(null)
const [isLocked, setIsLocked] = useScrollLock(el)

setIsLocked(true) // lock
setIsLocked(false) // unlock
```

## Type Declarations

```ts
/**
 * An element (or `Window` / `Document`) whose scrolling can be locked, including `null` /
 * `undefined` while it is not available yet.
 */
export type ScrollLockElement =
  HTMLElement | SVGElement | Window | Document | null | undefined
/**
 * The scroll-lock target: a React ref object holding the element (or `Window` / `Document`) — the
 * React equivalent of upstream's `MaybeRefOrGetter<HTMLElement | SVGElement | Window | Document |
 * null | undefined>`. A plain element, a getter and a callback ref are not accepted; the ref is
 * read with the shared `unrefElement`.
 */
export type ScrollLockTarget = RefObject<ScrollLockElement>
/**
 * Return of `useScrollLock`: the current lock state and its setter — `setIsLocked(true)` locks the
 * element, `setIsLocked(false)` unlocks it (the React form of upstream's writable `computed`
 * return).
 */
export type UseScrollLockReturn = [
  isLocked: boolean,
  setIsLocked: (value: boolean) => void,
]
/**
 * Map from @vueuse/core `useScrollLock`
 * (`source/vueuse/packages/core/useScrollLock/`).
 *
 * @example
 * const el = useRef<HTMLDivElement>(null)
 * const [isLocked, setIsLocked] = useScrollLock(el)
 *
 * setIsLocked(true) // lock
 * setIsLocked(false) // unlock
 */
export declare function useScrollLock(
  element: ScrollLockTarget,
  initialState?: boolean,
): UseScrollLockReturn
```
