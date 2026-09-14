<div align="center">

<img src="packages/public/vueuse.svg" width="100" alt="VueUse" style="vertical-align: middle" />
&nbsp;&nbsp; → &nbsp;&nbsp;
<img src="packages/public/reause.svg" width="100" alt="reause" style="vertical-align: middle" />

# reause

**React hooks continuously AI-mapped from VueUse and other upstream libraries**

[![Status: Experimental](https://img.shields.io/badge/status-experimental-orange)](https://github.com/hairyf/reause)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

> ✅ **VueUse mapping complete**: the base architecture is a 1:1 mirror of VueUse, and every `@vueuse/*` composable is accounted for — either mirrored by a React hook, or recorded as intentionally impractical (Vue-only `ref`/reactivity APIs, decided per mapping issue).
> The other sources (see [Sources](#sources)) are an open, growing set tracked per mapping issue — no completeness is claimed for them.
> The generated [function mapping table](meta/functions.md) tracks each export with the source it came from; §3.2 of [docs/upstream-monitoring.md](docs/upstream-monitoring.md) documents the coverage audit behind the VueUse claim.

</div>

## What is this?

`reause` is an experimental React hooks library mapped from **several upstream sources**. [VueUse](https://vueuse.org) is the foundational one — it defines the package layout, the architecture and most of the surface — but it is not the only one:

- The official [vueuse/vueuse](https://github.com/vueuse/vueuse) repository is referenced as a git submodule (`source/vueuse`) and is the source of truth for every port that names no other source
- Each other source is pinned as its own read-only checkout under `source/*` and is the source of truth for the ports that name it
- The package structure mirrors VueUse 1:1 and is fixed, but every API is React-flavored (`useState` / `useEffect` / `useMemo` …)
- AI continuously maps upstream implementations to React hooks, and each port records its upstream in a `` Map from <source> `<upstream-symbol>` `` JSDoc annotation

See [packages/guide/architecture.md](packages/guide/architecture.md) for the full source → reause architecture mapping.

## Sources

reause maps from five upstream sources. The `source` id in the table is the one the generated [function mapping table](meta/functions.md) records per export:

| source        | upstream                                                                       | how it is ported                                                                                          |
| ------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `vueuse`      | [vueuse/vueuse](https://github.com/vueuse/vueuse)                              | adapted to React — naming conversions (`ref*` → `useState*`, `on*` → `use*`) and React return conventions |
| `react-use`   | [streamich/react-use](https://github.com/streamich/react-use)                  | direct mirror — upstream names and return shapes kept                                                     |
| `react-hookz` | [react-hookz/web](https://github.com/react-hookz/web)                          | direct mirror                                                                                             |
| `mantine`     | [mantinedev/mantine](https://github.com/mantinedev/mantine) (`@mantine/hooks`) | direct mirror, detached from `@mantine/core`                                                              |
| `ahooks`      | [alibaba/hooks](https://github.com/alibaba/hooks)                              | direct mirror with documented renames                                                                     |

All five sources are pinned as read-only submodule checkouts under `source/*` (`vueuse`, `react-use`, `react-hookz`, `mantine`, `ahooks`), and every port is checked against its own source's pin. A `source/usehooks` checkout is also mounted, but it has no ports yet and is not a registry source.

Only `source/vueuse` is polled for upstream updates — the other checkouts are provenance-only ([docs/upstream-monitoring.md](docs/upstream-monitoring.md) §1). Per-source naming and return-value rules are in [AGENTS.md](https://github.com/hairyf/reause/blob/main/AGENTS.md) §1, and [`docs/mapping-issue-template.md`](https://github.com/hairyf/reause/blob/main/docs/mapping-issue-template.md) is the template for mapping decisions.

## Package structure (mirroring VueUse)

| VueUse                 | reause                 | status       |
| ---------------------- | ---------------------- | ------------ |
| `@vueuse/core`         | `@reause/core`         | ✅ completed |
| `@vueuse/shared`       | `@reause/shared`       | ✅ completed |
| `@vueuse/integrations` | `@reause/integrations` | ✅ completed |
| `@vueuse/math`         | `@reause/math`         | ✅ completed |
| `@vueuse/metadata`     | `@reause/metadata`     | ✅ completed |
| `@vueuse/rxjs`         | `@reause/rxjs`         | ✅ completed |
| `@vueuse/electron`     | `@reause/electron`     | ✅ completed |
| `@vueuse/firebase`     | `@reause/firebase`     | ✅ completed |
| `@vueuse/skills`       | `@reause/skills`       | ✅ completed |
| `@vueuse/components`   | —                      | ⏳ TODO      |

The layout above is fixed and still mirrors VueUse 1:1: hooks ported from the other sources are added to these **existing** packages, so there is no `@reause/react-use`-style package to install.

## Quick start

```bash
git clone --recurse-submodules https://github.com/hairyf/reause.git
cd reause
pnpm install
npm run typecheck
```

## Mapped examples

The complete list lives in the generated [function mapping table](meta/functions.md).
A few entry points:

- `useToggle` → [`packages/shared/useToggle/index.tsx`](packages/shared/useToggle/index.tsx)
- `useCounter` → [`packages/shared/useCounter/index.tsx`](packages/shared/useCounter/index.tsx)
- `useNow` → [`packages/core/useNow/index.tsx`](packages/core/useNow/index.tsx)
- `useStorage` → [`packages/core/useStorage/index.tsx`](packages/core/useStorage/index.tsx)

## Status

- [x] Large-scale AI mapping of all `@vueuse/core` functions
- [x] `rxjs` / `electron` / `firebase` / `skills` sub-packages
- [x] Publish to npm (`@reause/*`)

## License

[MIT](LICENSE). VueUse logo from [vueuse/vueuse](https://github.com/vueuse/vueuse) (MIT licensed); the reause logo is a React-colored variant of the same lettering.
