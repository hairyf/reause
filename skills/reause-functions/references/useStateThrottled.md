---
category: Reactivity
---

# useStateThrottled

Throttle changing of a state value

## Usage

```tsx
import { useStateThrottled } from '@reause/shared'

const [input, setInput, throttled] = useStateThrottled('', 1000)
```

The first argument is a `State<T>` source. Besides a plain value, you can pass a controlled tuple or object:

```tsx
const [value, setValue] = useState('')
const [input, setInput, throttled] = useStateThrottled([value, setValue], 1000)
// or: useStateThrottled({ value, onChange: setValue }, 1000)
```

An example with an object value.

```tsx
import { useStateThrottled } from '@reause/shared'

const [data, setData, throttled] = useStateThrottled({
  count: 0,
  name: 'foo',
}, 1000)

setData({ count: 1, name: 'foo' })
console.log(throttled) // { count: 1, name: 'foo' } (immediate, leading edge)

setData({ count: 2, name: 'bar' })
setData({ count: 3, name: 'baz' })
setData({ count: 4, name: 'qux' })
console.log(throttled) // { count: 1, name: 'foo' } (still the first value)

// After 1000ms the trailing edge applies the latest change
await sleep(1100)
setData({ count: 5, name: 'final' })
console.log(throttled) // { count: 5, name: 'final' } (updated)
```

### Trailing

If you don't want to watch trailing changes, set the 3rd param `false` (it's
`true` by default):

```tsx
const [input, setInput, throttled] = useStateThrottled('', 1000, false)
```

### Leading

Allows the value to be committed immediately (on the leading edge of the `ms`
timeout). If you don't want this behavior, set the 4th param `false` (it's
`true` by default):

```tsx
const [input, setInput, throttled] = useStateThrottled('', 1000, undefined, false)
```

## Recommended Reading

- [Debounce vs Throttle: Definitive Visual Guide](https://kettanaito.com/blog/debounce-vs-throttle)
- [Debouncing and Throttling Explained Through Examples](https://css-tricks.com/debouncing-throttling-explained-examples/)

## Type Declarations

```ts
export type UseStateThrottledReturn<T = any> = [
  value: T,
  setValue: Dispatch<SetStateAction<T>>,
  throttled: T,
]
/**
 * Throttle changing of a state value — React port of VueUse's `refThrottled`.
 *
 * The `value` argument accepts any `State<T>` supported by `useControllableState`: a plain value,
 * lazy initializer, controlled tuple, or `{ value, onChange }` source. The returned tuple contains
 * the current value, its setter, and a throttled mirror.
 *
 * A `delay <= 0` short-circuits like upstream (`if (delay <= 0) return value`): the throttled
 * element is the input itself — no throttling, no timers.
 *
 * @param value State source accepted by `useControllableState`.
 * @param delay Delay in milliseconds between commits (default: 200).
 * @param trailing Whether to commit the latest value after the window (default: true).
 * @param leading Whether to commit on the leading edge (default: true).
 */
export declare function useStateThrottled<T = any>(
  value: State<T>,
  delay?: number,
  trailing?: boolean,
  leading?: boolean,
): UseStateThrottledReturn<T>
```
