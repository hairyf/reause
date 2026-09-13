# Get Started

`reause` is a collection of React hooks based on the Hooks
API (`useState` / `useEffect` / `useCallback` / `useMemo`). We assume you are
already familiar with the basic ideas of [React Hooks](https://react.dev/reference/react)
before you continue.

It is a React hooks library mapped from **six upstream sources**, with
[VueUse](https://vueuse.org) as the foundational one: the VueUse mirror is
complete modulo documented carve-outs — each `@vueuse/*` composable is either
mapped to a React hook with the same options and return shape, adapted to the
React idiom, or recorded as intentionally impractical. The package structure,
docs and demos still mirror VueUse 1:1; the other sources are ported on their own
terms (see [Sources](#sources) below).

- The official [vueuse/vueuse](https://github.com/vueuse/vueuse) repository is referenced as a
  git submodule (`source/vueuse`) and is the source of truth for every port that names no
  other source; the other sources are pinned as their own checkouts under `source/*` (see
  [Sources](#sources) below)
- Every exported function is mapped from the upstream implementation named by its
  `Map from <source>` JSDoc annotation — mostly React hooks (`useX`), alongside non-hook
  helpers such as `createEventHook`, `clamp` or `toObserver`
- 27 upstream functions are recorded as intentionally impractical (Vue-only `ref` /
  reactivity APIs) and the renderless `@vueuse/components` surface is not mapped yet
  ([#879](https://github.com/hairyf/reause/issues/879)) — the generated
  [function registry](/functions) tracks each one, and
  [§3.2 of the coverage audit](https://github.com/hairyf/reause/blob/main/docs/upstream-monitoring.md)
  documents the decisions behind those carve-outs
- See [architecture](/guide/architecture) for the full source → reause mapping

## Sources

reause maps from six upstream sources; the `source` id is the one the generated [function registry](/functions) records per export:

| source         | upstream                                                                       | how it is ported                                                                                          |
| -------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `vueuse`       | [vueuse/vueuse](https://github.com/vueuse/vueuse)                              | adapted to React — naming conversions (`ref*` → `useState*`, `on*` → `use*`) and React return conventions |
| `react-use`    | [streamich/react-use](https://github.com/streamich/react-use)                  | direct mirror — upstream names and return shapes kept                                                     |
| `react-hookz`  | [react-hookz/web](https://github.com/react-hookz/web)                          | direct mirror                                                                                             |
| `mantine`      | [mantinedev/mantine](https://github.com/mantinedev/mantine) (`@mantine/hooks`) | direct mirror, detached from `@mantine/core`                                                              |
| `ahooks`       | [alibaba/hooks](https://github.com/alibaba/hooks)                              | direct mirror with documented renames                                                                     |
| `react-spring` | `@react-spring/web`                                                            | **re-export only** — no pinned checkout, so no 1:1 mirror is claimed                                      |

Five of the six sources are pinned as read-only checkouts under `source/*` (`vueuse`, `react-use`, `react-hookz`, `mantine`, `ahooks`), and each port is checked against its own source's pin. **`react-spring` is not a port**: `@react-spring/web` has no pinned checkout, so `useSpring` re-exports it and the registry marks it `✅ re-exported` — no 1:1 mirror is claimed for it. Only `source/vueuse` is polled for upstream updates; the other checkouts are provenance-only ([docs/upstream-monitoring.md](https://github.com/hairyf/reause/blob/main/docs/upstream-monitoring.md) §1).

Per-source naming and return-value rules are in [AGENTS.md](https://github.com/hairyf/reause/blob/main/AGENTS.md) §1.

## Installation

```bash
npm i @reause/core
```

Packages mirror `@vueuse/*` 1:1 — install the package that matches the upstream
one. That layout is fixed: hooks ported from the other sources land in these same
packages, not in a package per source.

| VueUse                 | reause                 |
| ---------------------- | ---------------------- |
| `@vueuse/core`         | `@reause/core`         |
| `@vueuse/shared`       | `@reause/shared`       |
| `@vueuse/integrations` | `@reause/integrations` |
| `@vueuse/math`         | `@reause/math`         |
| `@vueuse/metadata`     | `@reause/metadata`     |
| `@vueuse/rxjs`         | `@reause/rxjs`         |
| `@vueuse/electron`     | `@reause/electron`     |
| `@vueuse/firebase`     | `@reause/firebase`     |
| `@vueuse/skills`       | `@reause/skills`       |

> reause requires React `>= 18`.

## Usage Example

Simply import the hooks you need. React hooks return plain values (not refs), so
you destructure and use them directly:

```tsx
import { useLocalStorage, useMouse, usePreferredDark } from '@reause/core'

function App() {
  // tracks mouse position
  const { x, y } = useMouse()

  // is user prefers dark theme
  const isDark = usePreferredDark()

  // persist state in localStorage
  const [store, setStore] = useLocalStorage('my-storage', {
    name: 'Apple',
    color: 'red',
  })

  return (
    <div>
      <p>
        pos:
        {x}
        ,
        {y}
      </p>
      <p>
        dark:
        {String(isDark)}
      </p>
      <button onClick={() => setStore(s => ({ ...s, color: 'green' }))}>
        green
      </button>
    </div>
  )
}
```

Refer to the [functions list](/functions) for more details.
