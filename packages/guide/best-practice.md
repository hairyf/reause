# Best Practice

## Destructuring

Most of the hooks in reause return an **object or a tuple** that you can
[destructure](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment)
to take what you need. Unlike VueUse — where the return is an object of refs
that must be read via `.value` — reause hooks return **plain React values**,
so there is no unwrapping step:

```tsx
import { useMouse } from '@reause/core'

// "x" and "y" are plain numbers
const { x, y } = useMouse()

console.log(x)

const mouse = useMouse()

console.log(mouse.x)
```

Hooks that expose a single writable value return a tuple, mirroring React's
own `useState`:

```tsx
import { useLocalStorage } from '@reause/core'

const [store, setStore] = useLocalStorage('my-store', { hello: 'hi' })
```

### Side-effect Clean Up

Similar to how React's `useEffect` cleanup runs when a component unmounts,
reause hooks clean up their side-effects automatically.

For example, `useEventListener` will call `removeEventListener` when the
component is unmounted.

```tsx
import { useEventListener } from '@reause/core'

// will cleanup automatically
useEventListener('mousemove', () => {})
```

All reause hooks follow this convention.

To manually detach the side-effects, some hooks return a stop handler just
like React's `useEffect` cleanup. For example:

```tsx
import { useEventListener } from '@reause/core'

const stop = useEventListener('mousemove', () => {})

// ...

// unregister the event listener manually
stop()
```

Not all hooks return a stop handler; the general guarantee is that every
side-effect is cleaned up on unmount (React effects do this for free), so you
usually do not need to call it yourself.

### Reactive Arguments

In Vue, `setup()` constructs the "connections" between data and logic, and
VueUse functions accept **refs** as arguments because refs are reactive. React
has no reactive refs: state lives in `useState`, and refs are plain mutable
`{ current }` objects. reause adapts the argument rules accordingly:

- **read-only value sources** (e.g. `useTitle`'s title, `useFetch`'s url)
  accept plain values. Pass a state value directly; the hook re-syncs when it
  changes across renders;
- **DOM hooks** (e.g. `useEventListener`, `useInfiniteScroll`) accept a React
  ref (`RefObject<T | null>`) so you can bind a `useRef` target; the hook
  reads the element with `unrefElement`.

Take `useTitle` as an example. It helps you get and set the current page's
`document.title` property:

```tsx
import { useDark, useTitle } from '@reause/core'
import { useEffect } from 'react'

// `useDark` returns an `[isDark, toggleDark]` tuple — destructure the boolean
const [isDark] = useDark()
const [title, setTitle] = useTitle('Hello')

console.log(document.title) // "Hello"

useEffect(() => {
  setTitle(isDark ? '🌙 Good evening!' : '☀️ Good morning!')
}, [isDark])
```

Or pass a value that is re-synced when it changes — the hook keeps the
document title in sync automatically:

```tsx
import { useDark, useTitle } from '@reause/core'

const [isDark] = useDark()

useTitle(isDark ? '🌙 Good evening!' : '☀️ Good morning!')
```
