---
category: Watch
---

# useWatchThrottled

Throttled watch. The callback will be invoked at most once per specified duration

## Usage

Similar to `useWatch`, but offering extra options `throttle`, `trailing`, and
`leading` which will be applied to the callback function.

```tsx
import { useWatchThrottled } from '@reause/shared'

useWatchThrottled(
  input,
  () => { console.log('changed!') },
  { throttle: 500 },
)
```

### Options

| Option      | Type      | Default | Description                                                              |
| ----------- | --------- | ------- | ------------------------------------------------------------------------ |
| `throttle`  | `number`  | `0`     | Throttle interval in ms                                                  |
| `trailing`  | `boolean` | `true`  | Invoke on the trailing edge                                              |
| `leading`   | `boolean` | `true`  | Invoke on the leading edge                                               |
| `immediate` | `boolean` | `false` | Fire the callback once on mount with the current value (still throttled) |

### Leading and Trailing

Control when the callback is invoked:

```tsx
import { useWatchThrottled } from '@reause/shared'

// Only invoke at the start of each throttle period
useWatchThrottled(source, callback, {
  throttle: 500,
  leading: true,
  trailing: false,
})

// Only invoke at the end of each throttle period
useWatchThrottled(source, callback, {
  throttle: 500,
  leading: false,
  trailing: true,
})
```

Fire the callback once on mount with the current value (still throttled):

```tsx
import { useWatchThrottled } from '@reause/shared'

useWatchThrottled(input, () => console.log('changed!'), { immediate: true })
```
