# Get Started

`reause` is a collection of React hooks based on the Hooks
API (`useState` / `useEffect` / `useCallback` / `useMemo`). We assume you are
already familiar with the basic ideas of [React Hooks](https://react.dev/reference/react)
before you continue.

## Sources

reause maps from five upstream sources; the `source` id is the one the generated [function registry](/functions) records per export:

| source        | upstream                                                                       | how it is ported                                                                                          |
| ------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `vueuse`      | [vueuse/vueuse](https://github.com/vueuse/vueuse)                              | adapted to React — naming conversions (`ref*` → `useState*`, `on*` → `use*`) and React return conventions |
| `react-use`   | [streamich/react-use](https://github.com/streamich/react-use)                  | direct mirror — upstream names and return shapes kept                                                     |
| `react-hookz` | [react-hookz/web](https://github.com/react-hookz/web)                          | direct mirror                                                                                             |
| `mantine`     | [mantinedev/mantine](https://github.com/mantinedev/mantine) (`@mantine/hooks`) | direct mirror, detached from `@mantine/core`                                                              |
| `ahooks`      | [alibaba/hooks](https://github.com/alibaba/hooks)                              | direct mirror with documented renames                                                                     |

All five sources are pinned as read-only checkouts under `source/*` (`vueuse`, `react-use`, `react-hookz`, `mantine`, `ahooks`), and each port is checked against its own source's pin. Only `source/vueuse` is polled for upstream updates; the other checkouts are provenance-only ([docs/upstream-monitoring.md](https://github.com/hairyf/reause/blob/main/docs/upstream-monitoring.md) §1).

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
