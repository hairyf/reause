---
category: Reactivity
---

# useAsync

Derived value for async functions

## Usage

```tsx
import { useAsync } from '@reause/core'
import { useState } from 'react'

const [name, setName] = useState('jack')

const userInfo = useAsync(
  async () => {
    return await mockLookUp(name)
  },
  null, // initial state
  { deps: [name] },
)
```

### Evaluation State

Use the `onEvaluating` callback to track if the async function is currently evaluating.

```tsx
import { useAsync } from '@reause/core'
import { useState } from 'react'

const [evaluating, setEvaluating] = useState(false)

const userInfo = useAsync(
  async () => { /* your logic */ },
  null,
  { onEvaluating: setEvaluating },
)
```

### onCancel

When the derived value's dependencies change before the previous async function resolves, you may want to cancel the previous one. Here is an example showing how to incorporate with the fetch API.

```tsx
import { useAsync } from '@reause/core'
import { useState } from 'react'

const [packageName, setPackageName] = useState('@reause/core')

const downloads = useAsync(async (onCancel) => {
  const abortController = new AbortController()

  onCancel(() => abortController.abort())

  return await fetch(
    `https://api.npmjs.org/downloads/point/last-week/${packageName}`,
    { signal: abortController.signal },
  )
    .then(response => response.ok ? response.json() : { downloads: '—' })
    .then(result => result.downloads)
}, 0, { deps: [packageName] })
```

### Lazy

By default, `useAsync` will start resolving immediately on creation. Specify `skipInitial: true` to skip the initial evaluation and start resolving only when `deps` change.

```tsx
import { useAsync } from '@reause/core'
import { useState } from 'react'

const [evaluating, setEvaluating] = useState(false)

const userInfo = useAsync(
  async () => { /* your logic */ },
  null,
  { skipInitial: true, onEvaluating: setEvaluating },
)
```

### Error Handling

Use the `onError` callback to handle errors from the async function.

```tsx
import { useAsync } from '@reause/core'
import { useState } from 'react'

const [name, setName] = useState('jack')

const userInfo = useAsync(
  async () => {
    return await mockLookUp(name)
  },
  null,
  {
    deps: [name],
    onError(e) {
      console.error('Failed to fetch user info', e)
    },
  },
)
```

### Shallow Ref

By default, upstream uses `shallowRef` internally. React state is always a fresh object, so the shallow-ref caveat does not apply.

## Caveats

- Just like an effect keyed by `deps`, `useAsync` re-evaluates when the dependencies in the `deps` array change. Note however that only dependencies listed in `deps` are considered for this. In other words: **Values that are accessed asynchronously inside the callback will not trigger re-evaluation of the derived value.**
- Re-evaluation of the derived value is triggered whenever the `deps` change, regardless of whether its result is currently being used.

## Type Declarations

```ts
/**
 * Upstream re-exports `Fn` from `@vueuse/shared` types; `@reause/shared` does not export it, so it
 * is declared locally here (same pattern as `packages/shared/useIntervalFn/index.tsx`).
 */
type Fn = () => void
/**
 * Handle overlapping async evaluations.
 *
 * @param cancelCallback The provided callback is invoked when a re-evaluation of the computed value is triggered before the previous one finished
 */
export type UseAsyncOnCancel = (cancelCallback: Fn) => void
export interface UseAsyncOptions {
  /**
   * React dependency array driving re-evaluation (replaces upstream's automatic reactive-dep
   * tracking). Defaults to `[]` = evaluate once on mount.
   */
  deps?: unknown[]
  /** Called with `true` when an evaluation starts, `false` when it settles. Replaces upstream's `evaluating` ref. */
  onEvaluating?: (value: boolean) => void
  /**
   * When true, skip the initial mount evaluation; evaluate only when `deps` change. With the
   * default `[]` deps the hook then never evaluates.
   *
   * This is the reause replacement for upstream's `lazy`. Upstream's `lazy` starts evaluation on
   * the first access to the returned computed; React has no first-access hook, so that semantic has
   * no equivalent here.
   *
   * @default false
   */
  skipInitial?: boolean
  /**
   * @deprecated Use `skipInitial` instead. Kept as an alias with identical
   * behavior (skip the mount evaluation); it does NOT carry upstream's
   * "evaluate on the first access" semantics. `skipInitial` wins when both
   * are passed.
   */
  lazy?: boolean
  /** Called when the evaluation callback rejects; the current state is kept. */
  onError?: (error: unknown) => void
}
/**
 * Map from @vueuse/core `computedAsync`
 * (`source/vueuse/packages/core/computedAsync/`).
 *
 * @__NO_SIDE_EFFECTS__
 * @example
 * const downloads = useAsync(
 *   async (onCancel) => {
 *     const controller = new AbortController()
 *     onCancel(() => controller.abort())
 *     const response = await fetch(url, { signal: controller.signal })
 *     return response.ok ? (await response.json() as { downloads: number }).downloads : 0
 *   },
 *   0,
 *   { deps: [packageName] },
 * )
 *
 * @see https://vueuse.org/computedAsync/
 */
export declare function useAsync<T>(
  evaluationCallback: (onCancel: UseAsyncOnCancel) => T | Promise<T>,
  initialState: State<T>,
  options?: UseAsyncOptions,
): T
export declare function useAsync<T>(
  evaluationCallback: (onCancel: UseAsyncOnCancel) => T | Promise<T>,
  initialState?: undefined,
  options?: UseAsyncOptions,
): T | undefined
```
