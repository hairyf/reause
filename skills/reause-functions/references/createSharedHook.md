---
category: State
related: createGlobalState
---

# createSharedHook

Make a composable function usable with multiple React components.

> [!WARNING]
> When used in an **SSR** environment, `createSharedHook` renders the uninitialized snapshot on the server and fills it in on the client after hydration, so the module-level store is never shared across server requests — avoiding [cross-request state pollution](https://vuejs.org/guide/scaling-up/ssr.html#cross-request-state-pollution).

## Usage

```ts
import { useMouse } from '@reause/core'
import { createSharedHook } from '@reause/shared'

const useSharedMouse = createSharedHook(useMouse)

// CompA
const { x, y } = useSharedMouse()

// CompB - reuses the same state; no new listeners are registered
const { x, y } = useSharedMouse()
```

The first consumer to render becomes the **creator**: it runs the wrapped hook on every render and publishes the result, while every other consumer only reads the shared snapshot. While the creator stays mounted the shared value keeps updating; if it unmounts while other consumers remain, the value **freezes** at the last published value (the wrapped hook's setters belong to the creator's component). When the last consumer unmounts, the optional `cleanup` callback runs and the shared state is dropped; a later mount starts a fresh instance.

## Type Declarations

```ts
/**
 * Map from @vueuse/shared `createSharedComposable`.
 *
 * @see https://vueuse.org/createSharedComposable
 * @param hook The composable to share across every consumer of the returned
 * hook. It runs on every render of the first consumer (the creator).
 * @param cleanup Called when the last consumer unmounts, before the shared
 * state is dropped — the place to undo whatever `hook` set up outside React.
 */
export declare function createSharedHook<Fn extends (...args: any[]) => any>(
  hook: Fn,
  cleanup?: () => void,
): (...args: Parameters<Fn>) => ReturnType<Fn>
```
