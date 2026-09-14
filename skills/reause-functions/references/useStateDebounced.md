---
category: Reactivity
---

# useStateDebounced

A controllable state which will be debounced.

## Usage

```tsx
import { useStateDebounced } from '@reause/shared'

const [input, setInput, debounced] = useStateDebounced('foo', 1000)

setInput('bar')
console.log(debounced) // 'foo' — flips to 'bar' once the debounce elapses
```

Use an existing state tuple when the source is owned by the parent component:

```tsx
const state = useState('foo')
const [input, setInput, debounced] = useStateDebounced(state, 1000)
```

For controlled state, updates are sent to `onChange` and the debounced value follows the controlled value after the delay:

```tsx
const [input, setInput, debounced] = useStateDebounced(
  { value, onChange: setValue },
  300,
)
```

An example with an object value.

```tsx
import { useStateDebounced } from '@reause/shared'

const [data, setData, debounced] = useStateDebounced({
  name: 'foo',
  age: 18,
}, 1000)

function update() {
  setData({
    ...data,
    name: 'bar',
  })
}

console.log(debounced) // { name: 'foo', age: 18 }
update()
await sleep(1100)

console.log(debounced) // { name: 'bar', age: 18 }
```

You can also pass an optional 3rd parameter including the `maxWait` option. See `useDebounceFn` for details.

## Recommended Reading

- [**Debounce vs Throttle**: Definitive Visual Guide](https://kettanaito.com/blog/debounce-vs-throttle)

## Type Declarations

```ts
export type UseStateDebouncedReturn<T = any> = [
  value: T,
  setValue: Dispatch<SetStateAction<T>>,
  debounced: T,
]
/**
 * Debounce updates of a state value — React port of VueUse's `refDebounced`.
 *
 * Map from @vueuse/shared `refDebounced`
 * Mapping: upstream takes a Vue `Ref<T>` and returns a readonly ref that only
 * flips to the latest source value once it stops changing for `ms` (a watcher
 * hands every change to `useDebounceFn`). The naming follows this repo's
 * `ref* → useState*` rule (`refDebounced` → `useStateDebounced`), the Vue
 * `Ref<T>` input becomes a plain initial value, and the readonly ref becomes
 * an extra state slot — so the hook returns the tuple
 * `[value, setValue, debounced]`:
 *
 * ```ts
 * const [input, setInput, debounced] = useStateDebounced('foo', 1000)
 *
 * setInput('bar')
 * console.log(debounced) // 'foo' — flips to 'bar' once the debounce elapses
 * ```
 *
 * `value` is the source state, `setValue` its setter, and `debounced` lags
 * behind it by `ms`. Writes settle through a `useDebounceFn` updater, so a
 * burst of writes collapses into a single trailing update carrying the last
 * written value. `ms` (and `options.maxWait`) are plain numbers (upstream:
 * `MaybeRefOrGetter<number>`), read on every write; pending timers are cleared when the component unmounts
 * (upstream disposes with the effect scope). Note: a write only schedules the
 * debounce when the value actually changes — writing the same value is
 * skipped by `useControllableState`'s `Object.is` guard, so the pending timer
 * is not re-delayed (upstream's `watch` re-delays on every source write, even
 * unchanged ones).
 *
 * @example
 * ```ts
 * const [value, setValue, debounced] = useStateDebounced('foo', 1000)
 * ```
 */
export declare function useStateDebounced<T>(
  value: State<T>,
  ms?: number,
  options?: DebounceFilterOptions,
): UseStateDebouncedReturn<T>
```
