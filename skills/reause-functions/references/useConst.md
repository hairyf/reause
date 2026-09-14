---
category: Utilities
---

# useConst

Return a value that is computed **once**, on the first render, and then returned unchanged — same value, same reference — on every later render.

## Usage

```tsx
import { useConst } from '@reause/shared'

const config = useConst(() => buildExpensiveConfig())
```

- The initial value is resolved only on the **first** render. A function argument is called **exactly once**, during that first render, and its result is kept — pass a function to defer an expensive initial computation until the component actually renders.
- Every subsequent render returns the very same value. For objects, arrays, and functions that means the **same identity**, which is what a naive inline computation does not give you: `const options = { retries: 3 }` (or `createClient()`) runs on every render and produces a new value each time, re-triggering effects and memo comparisons that depend on it.
- The value is **not reactive**. Changing the argument after the first render has no effect, and mutating the returned value does not re-render the component — `useConst` is a constant for the lifetime of the component instance. That is exactly what makes it safe to use as a stable dependency:

```tsx
const options = useConst({ immediate: true })

useEffect(() => connect(options), [options]) // runs once — `options` never changes
```

The value lives in a ref, so the hook is also safe under concurrent rendering and server rendering: the first (or hydrating) render computes it once.

## Type Declarations

```ts
/**
 * Return a value that is computed **once**, on the first render, and then returned unchanged — same
 * reference, same value — on every later render.
 *
 * reause-only addition — there is no upstream VueUse or react-use counterpart to map from, so this
 * hook mirrors no upstream API.
 *
 * Semantics:
 * - `initialValue` is resolved only on the **first** render. When it is a
 *   function it is **called exactly once** (lazily, during that first render)
 *   and its return value is kept; pass a function to defer an expensive
 *   initial computation until the component actually renders.
 * - Every subsequent render returns the very same value. For objects, arrays,
 *   or functions that means the **same identity** is preserved across renders,
 *   which is what `useState` or an inline computation would *not* give you —
 *   an inline `{}` / `compute()` runs on every render and produces a new value
 *   each time (re-triggering effects and memo comparisons that depend on it).
 * - The value is **not reactive**: changing `initialValue` after the first
 *   render has no effect, and mutating the returned value does not re-render
 *   the component. It is a constant for the lifetime of the component
 *   instance, which is exactly what makes it safe to use as a stable
 *   dependency in `useEffect` / `useMemo` / `useCallback` dependency arrays.
 * - Because the value lives in a ref, the hook is safe under concurrent
 *   rendering and server rendering: the first render (or the hydration render)
 *   computes it once.
 *
 * @example
 * // expensive computation runs once, not on every render
 * const config = useConst(() => buildExpensiveConfig())
 *
 * @example
 * // stable identity — the effect below runs once
 * const options = useConst({ immediate: true })
 * useEffect(() => connect(options), [options])
 *
 * @param initialValue The value to keep, or a factory returning it. The
 * factory is invoked once, on the first render.
 */
export declare function useConst<T>(initialValue: T | (() => T)): T
```
