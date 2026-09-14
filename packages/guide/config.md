# Configurations

These show the general configurations for most of the hooks in reause.

## Event Filters

From v4.0, VueUse provides the Event Filters system to give the flexibility to
control when events will get triggered. reause mirrors the same filter
factories from `@reause/shared` — `debounceFilter` and `throttleFilter` — and
the `eventFilter` option on the hooks that support it. For example, you can
control the event trigger rate:

```tsx
import { throttleFilter, useMouse } from '@reause/core'

// mouse position will be updated at most once per 100ms
const { x, y } = useMouse({ eventFilter: throttleFilter(100) })
```

Debouncing with `useWatchWithFilter` (the `watch`-style hook with an
`eventFilter` option):

```tsx
import { debounceFilter, useWatchWithFilter } from '@reause/shared'

useWatchWithFilter(input, (next) => {
  // called only after `input` has been idle for 300ms
}, { eventFilter: debounceFilter(300) })
```

> React divergence: VueUse exposes `pausableFilter` for temporarily pausing
> events. reause does not ship a standalone `pausableFilter`; the pausable
> behavior lives in the dedicated pausable hooks (`useWatchPausable`, and the
> `*History` hooks' `pause` / `resume` / `isTracking` controls).

## Reactive Timing

VueUse's functions follow Vue's reactivity system defaults for
[flush timing](https://vuejs.org/guide/essentials/watchers.html#callback-flush-timing)
— `{ flush: 'pre' }` by default, with `'post'` and `'sync'` configurable.

React has no equivalent notion of flush timing: state updates are batched and
effects run after the browser paints, so reause hooks omit the `flush` option
entirely. Two idioms cover the VueUse use cases:

- **After a state mutation (upstream `flush: 'post'`):** write with the
  functional updater and read the new value in an effect that depends on it,
  or in the next render;
- **Synchronously (upstream `flush: 'sync'`):** use `useLayoutEffect` when you
  must read the DOM immediately after a commit.

## Global Dependencies

From v4.0, functions that access the browser APIs provide an option field to
specify the global dependencies (e.g. `window`, `document` and `navigator`). It
will use the global instance by default, so for most of the time, you don't
need to worry about it. This configure is useful when working with iframes and
testing environments.

```tsx
import { useMouse, useTitle } from '@reause/core'

// accessing parent context
const parentMousePos = useMouse({ window: window.parent })

const iframe = document.querySelector('#my-iframe')

// accessing child context
const childMousePos = useMouse({ window: iframe.contentWindow })

// passing a custom document to useTitle
useTitle('Hello', { document: iframe.contentDocument })
```

```tsx
// testing
const mockWindow = { /* ... */ }

const { x, y } = useMouse({ window: mockWindow })
```

Hooks that take a `navigator` (e.g. `useClipboard`) follow the same pattern
with a `navigator` option.

## Custom Scheduler

From v14.1.0, VueUse introduces a custom scheduler system that allows you to
control how time-based functions update internally. reause mirrors it for the
hooks that support timing. For example, `useNow` lets you replace its default
`useRafFn` scheduler (e.g. to slow updates down):

```tsx
import { useNow } from '@reause/core'
import { useIntervalFn } from '@reause/shared'

const { now, pause, resume } = useNow({
  controls: true,
  scheduler: cb => useIntervalFn(cb, 500),
})
```

> The `scheduler` is a hook that must follow the Rules of Hooks — it is called
> during render, so pass it consistently across renders.
