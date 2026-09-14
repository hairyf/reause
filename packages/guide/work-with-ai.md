# Work with AI

## Agent Skills

> [!IMPORTANT]
> 🧪 Experimental: reause Skills are currently experimental and under active development, feedback is welcome.

The [reause Skills](https://github.com/hairyf/reause/tree/main/skills) are AI Agent Skills maintained by the reause project, mirroring
[VueUse's `vueuse-functions` skill](https://github.com/vueuse/vueuse/tree/main/skills).

After installing the skill, when you use an AI Agent to assist with developing
React applications, it can automatically leverage the rich feature set provided
by reause.

This allows the agent to accurately use reause hooks **without requiring an
internet connection or additional permissions**.

### Installation

The `reause-functions` skill ships in this repository under
[`skills/reause-functions/`](https://github.com/hairyf/reause/tree/main/skills/reause-functions) — a `SKILL.md` plus
one reference document per hook. Point your AI agent at that folder (or copy it
into your agent's skills directory) so it can load the hook references
locally:

```bash
# most agent CLIs accept a local path or a repo path
npx skills add hairyf/reause
```

> If you are working in a clone of the reause repository, the skill is already
> available at `skills/reause-functions/` — just tell your agent where to find it.

### Usage

#### Using an Agent to Develop React Applications

Example prompt:

```
create a todo app with the following features:
- save todos to local storage
- show remains todo count on browser title
- add a copy button for each todo items
- infinite scrolling for this todo list
- dark / light mode
```

<details>
<summary>Output Snippet</summary>

```tsx
import {
  useClipboard,
  useColorMode,
  useInfiniteScroll,
  useLocalStorage,
  useTitle,
} from '@reause/core'
import { useRef, useState } from 'react'

interface Todo {
  id: number
  text: string
  done: boolean
}

const seedTexts = [
  'Review project goals',
  'Plan the next sprint',
  'Reply to client email',
]

const defaultTodos: Todo[] = Array.from({ length: 36 }, (_, index) => ({
  id: index + 1,
  text:
    seedTexts[index % seedTexts.length]
    + (index >= seedTexts.length ? ` #${index + 1}` : ''),
  done: index % 7 === 0,
}))

export default function App() {
  // persist todos in localStorage — setValue(null) clears the key
  const [todos, setTodos] = useLocalStorage<Todo[]>('focus-flow-todos', defaultTodos)

  const [newTodo, setNewTodo] = useState('')
  const [lastCopiedId, setLastCopiedId] = useState<number | null>(null)

  const totalCount = todos.length
  const remainingCount = todos.filter(todo => !todo.done).length
  const completedCount = totalCount - remainingCount

  // show remains todo count on the browser title (re-synced on change)
  useTitle(`Todos (${remainingCount})`)

  // dark / light mode, persisted to localStorage
  const [mode, setMode] = useColorMode({
    attribute: 'data-theme',
    disableTransition: false,
  })
  const isDark = mode === 'dark'

  function toggleMode() {
    setMode(isDark ? 'light' : 'dark')
  }

  // copy button for each todo item
  const [, copy, { copied, isSupported }] = useClipboard()

  async function handleCopy(todo: Todo) {
    await copy(todo.text)
    setLastCopiedId(todo.id)
  }

  // infinite scrolling for the todo list
  const pageSize = 8
  const [visibleCount, setVisibleCount] = useState(Math.min(pageSize, todos.length))
  const visibleTodos = todos.slice(0, visibleCount)

  const listRef = useRef<HTMLDivElement>(null)
  const { isLoading } = useInfiniteScroll(
    listRef,
    () => {
      setVisibleCount(c => Math.min(c + pageSize, todos.length))
    },
    {
      distance: 120,
      canLoadMore: () => visibleCount < todos.length,
    },
  )

  function syncVisibleCount() {
    if (todos.length <= pageSize) {
      setVisibleCount(todos.length)
      return
    }
    if (visibleCount === 0) {
      setVisibleCount(pageSize)
      return
    }
    if (visibleCount > todos.length)
      setVisibleCount(todos.length)
  }

  function addTodo() {
    const value = newTodo.trim()
    if (!value)
      return

    setTodos((prev) => {
      const nextId = prev.reduce((max, todo) => Math.max(max, todo.id), 0) + 1
      return [{ id: nextId, text: value, done: false }, ...prev]
    })
    setNewTodo('')
    syncVisibleCount()
  }

  function removeTodo(id: number) {
    setTodos(prev => prev.filter(todo => todo.id !== id))
    syncVisibleCount()
  }

  function toggleTodo(id: number) {
    setTodos(prev => prev.map(todo => todo.id === id ? { ...todo, done: !todo.done } : todo))
  }

  return (
    <div className="page">
      <header className="header">
        <div>
          <h1>Focus Flow</h1>
          <p className="subtitle">Keep a lightweight list, copy tasks with a click.</p>
        </div>
        <button className="btn" onClick={toggleMode}>
          {isDark ? 'Dark' : 'Light'}
          {' '}
          mode
        </button>
      </header>

      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault()
          addTodo()
        }}
      >
        <input
          value={newTodo}
          onChange={e => setNewTodo(e.target.value)}
          placeholder="Add a new task"
          maxLength={120}
          aria-label="Add a new task"
        />
        <button type="submit" disabled={!newTodo.trim()}>Add task</button>
        <div className="stats">
          <span>
            Total:
            {totalCount}
          </span>
          <span>
            Remaining:
            {remainingCount}
          </span>
          {completedCount > 0 && (
            <span>
              Done:
              {completedCount}
            </span>
          )}
        </div>
      </form>

      <section>
        <div className="list-head">
          <h2>Todo list</h2>
          <span>
            {visibleTodos.length}
            {' '}
            /
            {' '}
            {totalCount}
            {' '}
            shown
          </span>
        </div>
        <div ref={listRef} className="todo-list">
          {visibleTodos.map(todo => (
            <article key={todo.id} className={todo.done ? 'todo-item done' : 'todo-item'}>
              <label>
                <input
                  type="checkbox"
                  checked={todo.done}
                  onChange={() => toggleTodo(todo.id)}
                />
                {todo.text}
              </label>
              <div className="todo-actions">
                <button
                  disabled={!isSupported}
                  onClick={() => handleCopy(todo)}
                >
                  {copied && lastCopiedId === todo.id ? 'Copied' : 'Copy'}
                </button>
                <button onClick={() => removeTodo(todo.id)}>Remove</button>
              </div>
            </article>
          ))}

          {!visibleTodos.length && <p>No tasks yet. Add your first todo above.</p>}

          {visibleTodos.length > 0 && (
            <div className="list-footer">
              {isLoading
                ? 'Loading more...'
                : visibleTodos.length < totalCount
                  ? 'Scroll to load more'
                  : 'All caught up'}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
```

</details>

#### Asking the AI Agent How to Use reause

Example prompt:

```
which reause function can i use for local storage?
```

<details>
<summary>Output Snippet</summary>

Use `useStorage` (it defaults to `localStorage`), or the convenience wrapper `useLocalStorage`.

Example:

```tsx
import { useLocalStorage, useStorage } from '@reause/core'

const [state, setState] = useStorage('my-key', { hello: 'hi' }) // localStorage by default
const [theme, setTheme] = useLocalStorage('theme', 'light')

setState(null) // delete data from storage
```

</details>
