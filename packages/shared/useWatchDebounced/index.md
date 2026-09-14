---
category: Watch
---

# useWatchDebounced

Debounced watch. The callback will only be invoked after the source stops changing for the specified duration

## Usage

Similar to `useWatch`, but offering extra options `debounce` and `maxWait` which will
be applied to the callback function.

```tsx
import { useWatchDebounced } from '@reause/shared'

useWatchDebounced(
  input,
  () => { console.log('changed!') },
  { debounce: 500, maxWait: 1000 },
)
```

### Options

| Option      | Type      | Default | Description                                                              |
| ----------- | --------- | ------- | ------------------------------------------------------------------------ |
| `debounce`  | `number`  | `0`     | Debounce delay in ms                                                     |
| `maxWait`   | `number`  | —       | Maximum wait time before forced invocation                               |
| `immediate` | `boolean` | `false` | Fire the callback once on mount with the current value (still debounced) |

Fire the callback once on mount with the current value (still debounced):

```tsx
import { useWatchDebounced } from '@reause/shared'

useWatchDebounced(input, () => console.log('changed!'), { immediate: true })
```
