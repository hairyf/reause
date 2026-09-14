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
