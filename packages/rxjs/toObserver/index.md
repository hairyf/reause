---
category: '@RxJS'
---

# toObserver

Sugar function to convert a ref object (`RefObject`) or a setter function into an RxJS [Observer](https://rxjs.dev/guide/observer) — a `useRef` write does not re-render.

## Usage

```tsx
import { toObserver } from '@reause/rxjs'
import { useRef, useState } from 'react'
import { interval } from 'rxjs'
import { take } from 'rxjs/operators'

const [count, setCount] = useState(0)
const countRef = useRef(0)

interval(1000).pipe(take(5)).subscribe(toObserver(setCount)) // same as ).subscribe(val => setCount(val)) — re-renders
interval(1000).pipe(take(5)).subscribe(toObserver(countRef)) // same as ).subscribe(val => (countRef.current = val)) — no re-render
```
