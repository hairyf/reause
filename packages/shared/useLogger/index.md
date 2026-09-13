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
