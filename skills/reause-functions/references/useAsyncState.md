---
category: State
---

# useAsyncState

Reactive async state. It will not block your component and triggers changes once the promise is ready.

## Usage

```tsx
import { useAsyncState } from '@reause/core'

const initialState = { value: { id: null } }
const { state, isReady, isLoading, error, execute } = useAsyncState(
  fetchTodo,
  initialState,
)
```

### Return Values

| Property           | Description                                                                                                                    |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `state`            | The result of the async function                                                                                               |
| `setState`         | Set the state value directly, without re-executing the async function                                                          |
| `isReady`          | `true` when the latest execution has resolved successfully. Reset to `false` on each execution and stays `false` if it rejects |
| `isLoading`        | `true` while the promise is pending                                                                                            |
| `error`            | The error if the promise was rejected                                                                                          |
| `execute`          | Re-execute the async function with optional delay                                                                              |
| `executeImmediate` | Re-execute immediately (shorthand for `execute(0)`)                                                                            |

### Awaiting the Result

The return value is thenable, so you can await it and destructure directly:

```tsx
const { state, isReady } = await useAsyncState(fetchData, null)
// `state` is now populated, `isReady` is true
```

### Manual Execution

Set `immediate: false` to prevent automatic execution on mount.

```tsx
import { useAsyncState } from '@reause/core'

const { state, execute, executeImmediate } = useAsyncState(action, '', { immediate: false })

async function action() {
  await new Promise(resolve => setTimeout(resolve, 500))
  return 'done'
}

// trigger manually
executeImmediate()
execute(500) // delayed execution
```

### Options

```tsx
const { state } = useAsyncState(promise, initialState, {
  // Execute immediately on mount (default: true)
  immediate: true,
  // Delay before first execution in ms (default: 0)
  delay: 0,
  // Reset state to initial before each execution (default: true)
  resetOnExecute: true,
  // Accepted for API parity; no-op in React (default: true)
  shallow: true,
  // Throw errors instead of catching them (default: false)
  throwError: false,
  // Called when promise resolves
  onSuccess(data) {
    console.log('Success:', data)
  },
  // Called when promise rejects
  onError(error) {
    console.error('Error:', error)
  },
})
```

::: tip `shallow` is a no-op
VueUse uses `shallow` to choose between `shallowRef` and `ref` for `state` (default `true`). React
state is never deep-wrapped, so the option — and the `Shallow` generic that mirrors it — is accepted
for API parity only and has no effect: `state` is always the plain resolved value.
:::

## Type Declarations

```ts
export interface UseAsyncStateReturnBase<
  Data,
  Params extends any[],
  _Shallow extends boolean,
> {
  /**
   * The resolved result of the async function.
   *
   * Upstream types this as `Shallow extends true ? Ref<Data>: Ref<UnwrapRef<Data>>`, but React
   * state is never deep-wrapped, so both arms of that conditional are `Data`. The unused `_Shallow`
   * type parameter is kept only for generic-arity parity with VueUse and never affects this type.
   */
  state: Data
  /**
   * Set the state value directly, without re-executing the async function.
   *
   * The React equivalent of writing upstream's writable `state` ref (`state.value = next`). It
   * updates only `state`; `isReady`, `isLoading` and `error` are left untouched.
   */
  setState: Dispatch<SetStateAction<Data>>
  isReady: boolean
  isLoading: boolean
  error: unknown
  execute: (delay?: number, ...args: Params) => Promise<Data | undefined>
  executeImmediate: (...args: Params) => Promise<Data | undefined>
}
export type UseAsyncStateReturn<
  Data,
  Params extends any[],
  Shallow extends boolean,
> = UseAsyncStateReturnBase<Data, Params, Shallow> &
  PromiseLike<UseAsyncStateReturnBase<Data, Params, Shallow>>
export interface UseAsyncStateOptions<Shallow extends boolean = true, D = any> {
  /**
   * Delay for the first execution of the promise when "immediate" is true. In milliseconds.
   *
   * @default 0
   */
  delay?: number
  /**
   * Execute the promise right after the function is invoked. Will apply the delay if any.
   *
   * When set to false, you will need to execute it manually.
   *
   * @default true
   */
  immediate?: boolean
  /**
   * Callback when error is caught.
   */
  onError?: (e: unknown) => void
  /**
   * Callback when success is caught.
   * @param data
   */
  onSuccess?: (data: D) => void
  /**
   * Sets the state to initialState before executing the promise.
   *
   * This can be useful when calling the execute function more than once (for example, to refresh
   * data). When set to false, the current state remains unchanged until the promise resolves.
   *
   * @default true
   */
  resetOnExecute?: boolean
  /**
   * Use shallowRef.
   *
   * Accepted for API parity with VueUse only — React state is never deep-wrapped, so this option
   * has no effect.
   *
   * @default true
   */
  shallow?: Shallow
  /**
   * An error is thrown when executing the execute function.
   *
   * @default false
   */
  throwError?: boolean
}
/**
 * Map from @vueuse/core `useAsyncState`
 * (`source/vueuse/packages/core/useAsyncState/`).
 *
 * @example
 * const { state, setState, isReady, isLoading, error, execute } = useAsyncState(
 *   fetchData,
 *   initialData,
 * )
 * // pass `immediate: false` and call `execute()` manually instead
 * setState(nextData) // write `state` without re-executing
 *
 * @see https://vueuse.org/core/useAsyncState/
 */
export declare function useAsyncState<
  Data,
  Params extends any[] = any[],
  Shallow extends boolean = true,
>(
  promise: Promise<Data> | ((...args: Params) => Promise<Data>),
  initialState: Data,
  options?: UseAsyncStateOptions<Shallow, Data>,
): UseAsyncStateReturn<Data, Params, Shallow>
```
