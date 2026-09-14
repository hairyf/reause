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
 * Map from @vueuse/shared `refDebounced`.
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
