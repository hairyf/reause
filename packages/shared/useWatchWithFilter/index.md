---
category: Watch
---

# useWatchWithFilter

`watch` with additional EventFilter control

## Usage

Similar to `useWatch`, but with an `eventFilter` option that controls if events
should be received:

```tsx
import { useWatchWithFilter } from '@reause/shared'

useWatchWithFilter(
  input,
  () => { console.log('changed!') },
)
```

### Options

| Option        | Type          | Default                  | Description                                                             |
| ------------- | ------------- | ------------------------ | ----------------------------------------------------------------------- |
| `eventFilter` | `EventFilter` | bypass (invoke directly) | Filter for if events should be received (captured on mount)             |
| `immediate`   | `boolean`     | `false`                  | Fire the callback once on mount with the current value (still filtered) |

### Event Filters

The filter factories are exported alongside the hook — `debounceFilter(ms)`
and `throttleFilter(ms)` — mirroring upstream's filter semantics:

```tsx
import { debounceFilter, throttleFilter, useWatchWithFilter } from '@reause/shared'

// Debounce: bursts of changes collapse into one call 100ms after the last change,
// forced by maxWait when changes never settle
useWatchWithFilter(input, callback, { eventFilter: debounceFilter(100, { maxWait: 500 }) })

// Throttle: at most one call per 100ms window (leading + trailing edges by default)
useWatchWithFilter(scrollY, callback, { eventFilter: throttleFilter(100) })
```

### Stopping the watcher

```tsx
import { debounceFilter, useWatchWithFilter } from '@reause/shared'

const stop = useWatchWithFilter(source, callback, { eventFilter: debounceFilter(100) })

// further changes — and any pending filtered invocation — won't fire the callback
stop()
```

Fire the callback once on mount with the current value (still filtered):

```tsx
import { useWatchWithFilter } from '@reause/shared'

useWatchWithFilter(input, () => console.log('changed!'), { immediate: true })
```
