---
category: Lifecycle
---

# useLogger

Console-log a component's lifecycle transitions — mount, every update, and unmount.

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

## Type Declarations

```ts
/**
 * Map from react-use `useLogger`.
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
