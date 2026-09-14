---
category: '@RxJS'
---

# useSubscription

Use an RxJS [`Subscription`](https://rxjs.dev/guide/subscription) without worrying about unsubscribing from it or creating memory leaks.

## Install

```bash
npm i rxjs
```

## Usage

```tsx
import { useSubscription } from '@reause/rxjs'
import { useState } from 'react'
import { interval } from 'rxjs'

export function Counter() {
  const [count, setCount] = useState(0)

  // useSubscription calls the unsubscribe method before unmounting the component
  useSubscription(
    interval(1000)
      .subscribe(() => {
        setCount(c => c + 1)
      }),
  )

  return (
    <p>
      Counter:
      {count}
    </p>
  )
}
```

The subscription is torn down in the effect cleanup when the component unmounts, so the call site never needs its own `unsubscribe`. Like `useObservable`, the `subscription` argument is not an effect dependency: a new identity on a later render does not re-subscribe. Create the subscription once — with `useState`'s lazy initializer, `useRef`, or a module-scope value — when the component re-renders.

## Type Declarations

```ts
/**
 * Anything with an RxJS-style `unsubscribe` — upstream types the argument as `Unsubscribable`,
 * which is written structurally here because `rxjs@6` (the version this package resolves, `rxjs`
 * stays a `>=6.0.0` peer) keeps that interface in `rxjs/internal/types` instead of re-exporting it
 * from the package root. A structural type accepts `rxjs@6`'s and `rxjs@7`'s `Unsubscribable` /
 * `Subscription` alike and keeps the peer range honest.
 */
export interface UnsubscribableLike {
  unsubscribe: () => void
}
/**
 * Map from @vueuse/rxjs `useSubscription`
 * (`source/vueuse/packages/rxjs/useSubscription/`).
 *
 * @see https://vueuse.org/rxjs/useSubscription/
 * @example
 * const [count, setCount] = useState(0)
 * useSubscription(interval(1000).subscribe(() => setCount(c => c + 1)))
 * // unsubscribes when the component unmounts
 */
export declare function useSubscription(subscription: UnsubscribableLike): void
```
