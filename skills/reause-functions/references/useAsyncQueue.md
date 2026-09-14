---
category: Utilities
---

# useAsyncQueue

Executes each asynchronous task sequentially and passes the current task result to the next task

## Usage

```ts
import { useAsyncQueue } from '@reause/core'

function p1() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(1000)
    }, 10)
  })
}

function p2(result: number) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(1000 + result)
    }, 20)
  })
}

const { activeIndex, result } = useAsyncQueue([p1, p2])

console.log(activeIndex) // current pending task index (number)

console.log(result) // the tasks result
```

### Result State

Each task in the result array has a `state` and `data` property:

```ts
interface UseAsyncQueueResult<T> {
  state: 'aborted' | 'fulfilled' | 'pending' | 'rejected'
  data: T | null
}
```

### Interrupt on Failure

By default, if a task fails, subsequent tasks will not be executed. Set `interrupt: false` to continue executing even after failures.

```ts
const { result } = useAsyncQueue([p1, p2], {
  interrupt: false, // continue even if p1 fails
})
```

### Callbacks

```ts
const { result } = useAsyncQueue([p1, p2], {
  onError() {
    console.log('A task failed')
  },
  onFinished() {
    console.log('All tasks completed (or interrupted)')
  },
})
```

### Abort Signal

You can pass an `AbortSignal` to cancel the queue execution.

```ts
const controller = new AbortController()

const { result } = useAsyncQueue([p1, p2], {
  signal: controller.signal,
})

// Later, abort the queue
controller.abort()
```

### React Divergences

- `activeIndex` is a `number` and `result` is a plain array — read them directly, without `.value` (upstream returns a `ShallowRef` and a `reactive` array).
- The queue starts from a mount effect (after the first render) instead of synchronously during setup. A started ref keeps it running exactly once under React StrictMode's double-mounted effect.
- Once a task is marked `aborted`, a late resolution from an in-flight task does not overwrite the aborted entry.

## Type Declarations

```ts
export type UseAsyncQueueTask<T> = (...args: any[]) => T | Promise<T>
type MapQueueTask<T extends any[]> = {
  [K in keyof T]: UseAsyncQueueTask<T[K]>
}
export interface UseAsyncQueueResult<T> {
  state: "aborted" | "fulfilled" | "pending" | "rejected"
  data: T | null
}
export interface UseAsyncQueueReturn<T> {
  /** Current pending task index. */
  activeIndex: number
  /** The tasks result — an array of `{ state, data }` entries. */
  result: T
}
export interface UseAsyncQueueOptions {
  /**
   * Interrupt tasks when current task fails.
   *
   * @default true
   */
  interrupt?: boolean
  /**
   * Trigger it when the tasks fails.
   */
  onError?: () => void
  /**
   * Trigger it when the tasks ends.
   */
  onFinished?: () => void
  /**
   * A AbortSignal that can be used to abort the task.
   */
  signal?: AbortSignal
}
/**
 * Map from @vueuse/core `useAsyncQueue`
 * (`source/vueuse/packages/core/useAsyncQueue/`).
 *
 * @example
 * const { activeIndex, result } = useAsyncQueue([p1, p2])
 *
 * @see https://vueuse.org/core/useAsyncQueue/
 */
export declare function useAsyncQueue<T extends any[], S = MapQueueTask<T>>(
  tasks: S & Array<UseAsyncQueueTask<any>>,
  options?: UseAsyncQueueOptions,
): UseAsyncQueueReturn<{
  [P in keyof T]: UseAsyncQueueResult<T[P]>
}>
```
