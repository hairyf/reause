---
category: Lifecycle
---

# useLogger

Console-log a component's lifecycle transitions — mount, every update, and unmount — with extra values forwarded to the mount and update lines.

## Usage

```tsx
import { useLogger } from '@reause/shared'

function TodoList({ todos }: { todos: string[] }) {
  useLogger('TodoList', todos)

  return <ul>{todos.map(todo => <li key={todo}>{todo}</li>)}</ul>
}

// on mount:    "TodoList mounted" […]
// on a render: "TodoList updated" […]   ← one line per re-render after mount
// on unmount:  "TodoList unmounted"
```

The `unmounted` line carries the component name only — that is what upstream's cleanup closure logs, so no extra values appear after it.

Every argument after `componentName` is forwarded, spread, to the `mounted` and `updated` lines, and is taken from the render that logged it: the mount line prints the values of the render that mounted, and each update line prints the values of its own render. An update is therefore logged on **every** re-render after mount, not only when the logged values change. The upstream signature types the parameter `...rest` without a type, and this port keeps `any[]` rather than inventing a generic, so the two stay signature-identical.

Logging is **not** gated on `process.env.NODE_ENV`, matching upstream, which calls `console.log` unconditionally. To keep the output out of a production build, guard the call site instead:

```tsx
if (process.env.NODE_ENV !== 'production')
  useLogger('TodoList', todos)
```

A conditional call like that survives bundling. A `typeof process !== 'undefined'` prefix around an internal guard does not — Vite inlines `process.env.NODE_ENV` at build time without defining a `process` object, so such a guard folds to `false` in every browser bundle and the logging silently disappears. The mount and update effects are the merged `useEffectOnce` and `useUpdateEffect` hooks, so in a development `<StrictMode>` tree the mount render is double-invoked and both the `mounted` and `updated` lines fire there — the same behaviour upstream react-use has.

Upstream mapping files: `source/react-use/src/useLogger.ts` and `source/react-use/docs/useLogger.md`.

## Type Declarations

```ts
/**
 * Logs a component's lifecycle transitions to the console — React port of
 * react-use's `useLogger`.
 *
 * Map from react-use `useLogger`
 * Mapping: the pin is mirrored verbatim — three `console.log` calls, one per
 * phase, in this order: `"<componentName> mounted"` once after mount,
 * `"<componentName> updated"` on every re-render after mount, and
 * `"<componentName> unmounted"` on unmount. Every one of the first two is
 * followed by the hook's current `...rest` arguments, exactly as the pin
 * forwards them; the unmount line deliberately carries **no** extra arguments
 * because that is what upstream's cleanup closure logs.
 *
 * **No dev gate, matching the pin.** react-use calls `console.log`
 * unconditionally — there is no `process.env.NODE_ENV` check anywhere in
 * `source/react-use/src/useLogger.ts` — so adding one here would change the
 * observable behaviour of the port. Silence it at the call site instead:
 *
 * ```ts
 * if (process.env.NODE_ENV !== 'production')
 *   useLogger('TodoList', todos)
 * ```
 *
 * A conditional *call* like that is safe (the bundler reaches it), unlike a
 * `typeof process !== 'undefined'` prefix around an internal guard, which Vite
 * would fold to `false` in a browser bundle because it inlines
 * `process.env.NODE_ENV` without defining a `process` object.
 *
 * **`...rest` is captured per render, not once.** The mount line logs the
 * arguments of the render that mounted; the update line logs the arguments of
 * that* render. React-use types the parameter `...rest: any[]` and this port
 * keeps `any[]` rather than inventing a generic, so the two implementations
 * stay signature-identical; the logged values are compared by whatever
 * `console.log` does, not by this hook.
 *
 * The timings are inherited from the two merged siblings it composes —
 * `useEffectOnce` for mount+unmount and `useUpdateEffect` for update — rather
 * than reimplemented, so there is one copy of each primitive in the package.
 * That is the batch's standing disposition (the issue's "or inline the two
 * effects" branch is obsolete now that both hooks are merged and barrel-
 * exported). StrictMode follows from them: the mount render is double-invoked
 * and both passes share `useUpdateEffect`'s first-render ref, so in a
 * development StrictMode tree the committed render already reads the flip as
 * `false` and the update line fires at mount too (see `useUpdateEffect` for the
 * full note). Production is unaffected.
 *
 * Upstream default-exports this hook; reause exports it by name, the repo's
 * convention for the react-use mirrors. It touches neither `window` nor
 * `document`, so it is SSR-safe.
 *
 * @param componentName The name printed in each line.
 * @param rest Values logged after each mount/update line (never the unmount
 * line). Captured from the render that logged them.
 *
 * @example
 * useLogger('TodoList', todos)
 * // "TodoList mounted" […]
 * // "TodoList updated" […]   — on each subsequent render
 * // "TodoList unmounted"
 *
 * @see source/react-use/docs/useLogger.md (the pin's docs page, read directly
 * rather than fetched from a URL)
 */
export declare function useLogger(componentName: string, ...rest: any[]): void
```
