# Architecture Mapping — upstream sources → reause

How reause's monorepo architecture maps back to its upstream sources. The sections below
describe the [VueUse](https://github.com/vueuse/vueuse) mirror, which is what the package layout,
the docs structure and most of the surface are modelled on; ports that come from elsewhere are
covered in the **Non-VueUse sources** section (§13) below.

The official VueUse repository is referenced as a git submodule at [`source/vueuse`](https://github.com/hairyf/reause/tree/main/source/vueuse)
and is the source of truth for every port that names no other source. Each other source is pinned
as its own read-only checkout under `source/*`.
[`meta/functions.md`](https://github.com/hairyf/reause/blob/main/meta/functions.md)
records the resolved source for every export.

**Path consistency rule:** every VueUse file/folder has a reause counterpart at
the **same relative path** (`packages/.vitepress/`, `packages/<pkg>/<fn>/`, `meta/`,
`scripts/`, `playgrounds/`, `skills/`, …), including the per-function folders:
`packages/<pkg>/<fn>/index.tsx` + `index.md` + `demo.tsx` + `index.test.tsx`
(the `.tsx`/`.ts`/React file kinds are the only systematic deviation).
`@reause/metadata` is the single exception — its generated modules stay in
`packages/metadata/src/`.

**Status legend**

| Mark | Meaning                                    |
| ---- | ------------------------------------------ |
| ✅   | mirrored / implemented                     |
| ⏳   | TODO — not implemented yet                 |
| —    | not applicable to reause (VueUse-specific) |

## 1. Packages — `packages/`

VueUse's npm packages live in `packages/*`; reause mirrors the same layout with React-flavored APIs.

| VueUse package         | reause package                                                                             | status  |
| ---------------------- | ------------------------------------------------------------------------------------------ | ------- |
| `@vueuse/shared`       | [`@reause/shared`](https://github.com/hairyf/reause/tree/main/packages/shared)             | ✅      |
| `@vueuse/core`         | [`@reause/core`](https://github.com/hairyf/reause/tree/main/packages/core)                 | ✅      |
| `@vueuse/integrations` | [`@reause/integrations`](https://github.com/hairyf/reause/tree/main/packages/integrations) | ✅      |
| `@vueuse/math`         | [`@reause/math`](https://github.com/hairyf/reause/tree/main/packages/math)                 | ✅      |
| `@vueuse/metadata`     | [`@reause/metadata`](https://github.com/hairyf/reause/tree/main/packages/metadata)         | ✅      |
| `@vueuse/rxjs`         | [`@reause/rxjs`](https://github.com/hairyf/reause/tree/main/packages/rxjs)                 | ✅      |
| `@vueuse/electron`     | [`@reause/electron`](https://github.com/hairyf/reause/tree/main/packages/electron)         | ✅      |
| `@vueuse/firebase`     | [`@reause/firebase`](https://github.com/hairyf/reause/tree/main/packages/firebase)         | ✅      |
| `@vueuse/skills`       | [`@reause/skills`](https://github.com/hairyf/reause/tree/main/packages/skills)             | ✅      |
| `@vueuse/components`   | —                                                                                          | ⏳ TODO |

**Source layout** (uniform adaptation, documented once here):

| VueUse                                                     | reause                                                                                                                                                                               |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `packages/<pkg>/<fn>/index.ts`                             | `packages/<pkg>/<fn>/index.tsx`                                                                                                                                                      |
| `packages/<pkg>/<fn>/index.browser.test.ts`                | `packages/<pkg>/<fn>/index.test.tsx` (vitest-browser-react)                                                                                                                          |
| `packages/<pkg>/index.ts`                                  | `packages/<pkg>/index.ts` barrel (`@reause/metadata` keeps its generated files under `src/`)                                                                                         |
| `main`/`module`/`types` → `./dist/index.js` (package.json) | same — `exports`, `main`, `module`, `types`, `unpkg` and `jsdelivr` all point at the tsdown output, and every package rebuilds it at pack time through `"prepack": "pnpm run build"` |

Each reause package declares `react >= 18` as a peer dependency and bundles with tsdown
(`"build": "tsdown"` + per-package `tsdown.config.ts`). Tests, typechecks and the docs resolve
the workspace packages from **source** (`tsconfig.json` `paths` + the vitest/vitepress aliases,
mirroring upstream), so development needs no build step.

## 2. Function docs + demos — co-located per function

Mirrors upstream `packages/<pkg>/<fn>/{index.md,demo.vue}` exactly:

| VueUse                                             | reause                                                                                                                   | status |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------ |
| `packages/core/useNow/index.md` + `demo.vue`       | `packages/core/useNow/index.md` + [`demo.tsx`](https://github.com/hairyf/reause/blob/main/packages/core/useNow/demo.tsx) | ✅     |
| `packages/shared/useToggle/index.md` + `demo.vue`  | `packages/shared/useToggle/index.md` + `demo.tsx`                                                                        | ✅     |
| `packages/shared/useCounter/index.md` + `demo.vue` | `packages/shared/useCounter/index.md` + `demo.tsx`                                                                       | ✅     |

## 3. Docs site — `packages/.vitepress/`

The VitePress docs root is **`packages/`** (same as VueUse), with the site config inside
[`packages/.vitepress/`](https://github.com/hairyf/reause/tree/main/packages/.vitepress).

| VueUse                                           | reause                                                                                                                                                                                          | status |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `packages/.vitepress/config.ts`                  | [`packages/.vitepress/config.ts`](https://github.com/hairyf/reause/blob/main/packages/.vitepress/config.ts)                                                                                     | ✅     |
| `packages/.vitepress/shims.d.ts`                 | [`packages/.vitepress/shims.d.ts`](https://github.com/hairyf/reause/blob/main/packages/.vitepress/shims.d.ts)                                                                                   | ✅     |
| `packages/.vitepress/sw.ts` (workbox SW)         | [`packages/.vitepress/sw.ts`](https://github.com/hairyf/reause/blob/main/packages/.vitepress/sw.ts)                                                                                             | ✅     |
| `packages/.vitepress/transformHead.ts` (og meta) | inline `transformHead` in config.ts                                                                                                                                                             | ✅     |
| `packages/.vitepress/twoslash.ts`                | [`packages/.vitepress/twoslash.ts`](https://github.com/hairyf/reause/blob/main/packages/.vitepress/twoslash.ts) (injects `@reause/*` hook imports instead of Vue globals)                       | ✅     |
| `packages/.vitepress/vite.config.ts`             | PWA plugin wired in `config.ts` `vite.plugins`                                                                                                                                                  | ✅     |
| `packages/index.md` (home)                       | [`packages/index.md`](https://github.com/hairyf/reause/blob/main/packages/index.md)                                                                                                             | ✅     |
| `packages/functions.md`                          | [`packages/functions.md`](https://github.com/hairyf/reause/blob/main/packages/functions.md) (auto-generated)                                                                                    | ✅     |
| `packages/guide/`                                | [`packages/guide/`](https://github.com/hairyf/reause/tree/main/packages/guide)                                                                                                                  | ✅     |
| `packages/public/` (static assets)               | [`packages/public/`](https://github.com/hairyf/reause/tree/main/packages/public)                                                                                                                | ✅     |
| `guidelines.md` / `export-size.md`               | [`packages/guidelines.md`](https://github.com/hairyf/reause/blob/main/packages/guidelines.md) + [`packages/export-size.md`](https://github.com/hairyf/reause/blob/main/packages/export-size.md) | ✅     |

### `packages/.vitepress/plugins/`

All four VitePress plugins are mirrored with identical virtual-module contracts:

| VueUse plugin                                       | reause                                                                                                                                                                                                                                                    | status |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `plugins/changelog.ts` (`/virtual-changelog`)       | [`packages/.vitepress/plugins/changelog.ts`](https://github.com/hairyf/reause/blob/main/packages/.vitepress/plugins/changelog.ts) — `getChangeLog()` builds the rows from one `git log --name-only` pass instead of upstream's per-commit `git diff-tree` | ✅     |
| `plugins/contributors.ts` (`/virtual-contributors`) | [`packages/.vitepress/plugins/contributors.ts`](https://github.com/hairyf/reause/blob/main/packages/.vitepress/plugins/contributors.ts)                                                                                                                   | ✅     |
| `plugins/pwa-virtual.ts` (`virtual:pwa`)            | [`packages/.vitepress/plugins/pwa-virtual.ts`](https://github.com/hairyf/reause/blob/main/packages/.vitepress/plugins/pwa-virtual.ts)                                                                                                                     | ✅     |
| `plugins/markdownTransform.ts`                      | [`packages/.vitepress/plugins/markdownTransform.ts`](https://github.com/hairyf/reause/blob/main/packages/.vitepress/plugins/markdownTransform.ts) (linkify + twoslash meta/imports injection)                                                             | ✅     |

Data sources mirror upstream: changelog/contributors derive from `git log` of the
mapped files; `markdownTransform` links backticked function names from the
`@reause/metadata` function registry; `pwa-virtual` feeds the route list to `sw.ts`.

### `packages/.vitepress/theme/`

| VueUse                                                     | reause                                                                                                                                                                                                                                                              | status |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `theme/index.ts` (extends DefaultTheme)                    | [`theme/index.ts`](https://github.com/hairyf/reause/blob/main/packages/.vitepress/theme/index.ts)                                                                                                                                                                   | ✅     |
| `theme/styles/{main,vars,overrides,utils,demo}.css`        | same five files in [`theme/styles/`](https://github.com/hairyf/reause/tree/main/packages/.vitepress/theme/styles)                                                                                                                                                   | ✅     |
| `theme/components/DemoContainer.vue`                       | same — mounts React demos via `createRoot`                                                                                                                                                                                                                          | ✅     |
| `theme/components/Note.vue`                                | [`theme/components/Note.vue`](https://github.com/hairyf/reause/blob/main/packages/.vitepress/theme/components/Note.vue)                                                                                                                                             | ✅     |
| `theme/components/Contributors.vue`                        | [`theme/components/Contributors.vue`](https://github.com/hairyf/reause/blob/main/packages/.vitepress/theme/components/Contributors.vue)                                                                                                                             | ✅     |
| `theme/components/ReloadPrompt.vue`                        | [`theme/components/ReloadPrompt.vue`](https://github.com/hairyf/reause/blob/main/packages/.vitepress/theme/components/ReloadPrompt.vue)                                                                                                                             | ✅     |
| `theme/redirects.ts` (fn-name short links)                 | — handled by VitePress `_redirects` (scripts/redirects.ts)                                                                                                                                                                                                          | —      |
| `theme/components/FunctionBadge.vue` + `FunctionsList.vue` | [`theme/components/`](https://github.com/hairyf/reause/tree/main/packages/.vitepress/theme/components)                                                                                                                                                              | ✅     |
| `theme/components/FunctionInfo.vue`                        | [`theme/components/FunctionInfo.vue`](https://github.com/hairyf/reause/blob/main/packages/.vitepress/theme/components/FunctionInfo.vue) — the per-page info block, fed by `scripts/export-size.ts`                                                                  | ✅     |
| `theme/components/Changelog.vue` + `ChangelogEntry.vue`    | [`theme/components/Changelog.vue`](https://github.com/hairyf/reause/blob/main/packages/.vitepress/theme/components/Changelog.vue) — the `## Changelog` timeline, fed by `/virtual-changelog`; octicon glyphs are inlined because reause installs no icon collection | ✅     |
| `theme/utils.ts` (`renderCommitMessage`)                   | [`theme/utils.ts`](https://github.com/hairyf/reause/blob/main/packages/.vitepress/theme/utils.ts) — issue links point at `hairyf/reause`                                                                                                                            | ✅     |
| `theme/composables/{dark,versions}.ts`                     | — default theme handles dark mode; version shown via `meta/versions.ts`                                                                                                                                                                                             | —      |

## 4. Meta — `meta/`

| VueUse                                                  | purpose                             | reause                                                                                                                                | status |
| ------------------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `meta/packages.ts`                                      | package definitions                 | [`meta/packages.ts`](https://github.com/hairyf/reause/blob/main/meta/packages.ts), re-exported by `@reause/metadata`                  | ✅     |
| `meta/versions.ts`                                      | version info                        | [`meta/versions.ts`](https://github.com/hairyf/reause/blob/main/meta/versions.ts)                                                     | ✅     |
| `meta/ecosystem-functions.ts`                           | ecosystem registry                  | — Vue-specific                                                                                                                        | —      |
| —                                                       | mapping status table (reause extra) | [`meta/functions.md`](https://github.com/hairyf/reause/blob/main/meta/functions.md), auto-generated                                   | ✅     |
| `packages/metadata/metadata.ts` (generated fn registry) | function registry                   | [`packages/metadata/src/functions.ts`](https://github.com/hairyf/reause/blob/main/packages/metadata/src/functions.ts), auto-generated | ✅     |

## 5. CI — `.github/`

All of VueUse's CI surface is mirrored in [`../.github`](https://github.com/hairyf/reause/tree/main/.github).

| VueUse file                                  | purpose                                                                                                                                                                                                                 | reause |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `.github/workflows/ci.yml`                   | lint, test matrix (Node `22.x`, `lts/*`) with Playwright chromium + webkit and codecov, `pkg-pr-new` release preview, playground smoke test — on `push`/`pull_request` to `main`/`next`, plus `merge_group`             | ✅     |
| `.github/workflows/publish.yml`              | publish npm on merge of `release/*` PRs — npm **trusted publishing (OIDC)**, no token; runs `update:full` before `publish:ci`, and each package builds itself at pack time via `prepack` (release cut via `bumpp --pr`) | ✅     |
| `.github/workflows/autofix.yml`              | auto-fix bot (autofix.ci) for PRs                                                                                                                                                                                       | ✅     |
| `.github/workflows/export-size.yml`          | export-size CI report via `antfu/export-size-action` (`continue-on-error`: export-size's rollup bundler cannot resolve React's CJS-only `react/jsx-runtime` named export, so the step never blocks a PR)                | ✅     |
| `.github/ISSUE_TEMPLATE/bug_report.yml`      | bug report form                                                                                                                                                                                                         | ✅     |
| `.github/ISSUE_TEMPLATE/feature_request.yml` | feature request form                                                                                                                                                                                                    | ✅     |
| `.github/ISSUE_TEMPLATE/config.yml`          | issue template routing                                                                                                                                                                                                  | ✅     |
| `.github/PULL_REQUEST_TEMPLATE.md`           | PR template                                                                                                                                                                                                             | ✅     |
| `.github/FUNDING.yml`                        | sponsor buttons                                                                                                                                                                                                         | ✅     |
| `.github/stale.yml`                          | stale issue/PR bot                                                                                                                                                                                                      | ✅     |
| `.github/agentscan.yml`                      | GitHub agent scan config                                                                                                                                                                                                | ✅     |

## 6. Scripts — `scripts/`

VueUse's repo automation scripts (run with `tsx`) are all mirrored and working.

| VueUse script                                | reause                                                                                                | status |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------ |
| `scripts/clean.ts`                           | same — removes git-ignored build artifacts (`git clean -Xdn`)                                         | ✅     |
| `scripts/update.ts`                          | same — regenerates `meta/functions.md`, `packages/functions.md`, `packages/metadata/src/functions.ts` | ✅     |
| `scripts/publish.ts`                         | same — publishes `@reause/*` to npm (`publish:ci`)                                                    | ✅     |
| `scripts/export-size.ts`                     | same — gzip size report of built bundles (`size`)                                                     | ✅     |
| `scripts/backport.ts`                        | same — cherry-pick commits to older branches                                                          | ✅     |
| `scripts/redirects.ts`                       | same — Netlify `_redirects` for docs                                                                  | ✅     |
| `scripts/utils.ts` / `scripts/tsconfig.json` | same                                                                                                  | ✅     |

Root `package.json` scripts mirror VueUse's (`up`, `backport`, `build`, `build:packages`,
`build:redirects`, `clean`, `dev`/`docs`, `docs:build`, `docs:build:vitepress`, `docs:serve`,
`lint`, `lint:fix`, `publish:ci`, `release`, `release:prepare`, `size`, `test`, `test:cov`,
`test:exports`, `test:browser`, `test:chromium`, `test:webkit`, `test:other-browser`, `test:unit`,
`test:all`, `typecheck`, `update`, `update:full`, `update:skills`, `watch`, `prepare`; React
adaptations: `tsc` in place of `vue-tsc`); the docs commands run VitePress with **`packages`**
as the docs root. reause-specific one-off scripts (`add-mapfrom`, `contract-check`,
`create-mapping-issues`, `driver-core`, `unify-demo-layout`, `update-branch`) were removed in
the VueUse alignment.

## 7. Tests — vitest + vitest-browser-react

VueUse's vitest layout is mirrored: the `browser` project drives **vitest-browser-react** in real
browsers (chromium + webkit; firefox stays disabled upstream for flakiness) and the `exports`
project runs in plain node. VueUse's jsdom `unit` and `server` projects have no reause
counterpart — every hook test needs a real DOM, so `test:unit` is an alias of the chromium
browser project.

| VueUse                                                      | reause                                                                                                                                   | status |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `test/exports.test.ts`                                      | same — asserts public exports of every package                                                                                           | ✅     |
| `test/package-json-export.test.ts`                          | same — asserts `package.json` export maps                                                                                                | ✅     |
| per-function browser tests                                  | `packages/<pkg>/<fn>/index.test.tsx` via `vitest-browser-react`                                                                          | ✅     |
| vitest projects (`browser` / `unit` / `server` / `exports`) | `browser` (chromium + webkit) / `exports` (node) — see [`vitest.config.ts`](https://github.com/hairyf/reause/blob/main/vitest.config.ts) | ✅     |
| coverage (`test:cov`)                                       | `test:cov` (`--project="browser (chromium)" --project=exports`)                                                                          | ✅     |

## 8. Playgrounds — `playgrounds/`

| VueUse                                    | reause                                                                                                                                           |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `playgrounds/vite` (Vite demo playground) | ✅ [`playgrounds/vite`](https://github.com/hairyf/reause/tree/main/playgrounds/vite) (React + Vite)                                              |
| `playgrounds/nuxt`                        | ✅ [`playgrounds/next`](https://github.com/hairyf/reause/tree/main/playgrounds/next) (React + Next.js — the React analog of the Nuxt playground) |
| `playgrounds/build.sh`                    | ✅ [`playgrounds/build.sh`](https://github.com/hairyf/reause/blob/main/playgrounds/build.sh) (pnpm)                                              |

## 9. Patches — `patches/`

| VueUse                                                                               | reause                           |
| ------------------------------------------------------------------------------------ | -------------------------------- |
| `patches/google-font-installer@1.2.0.patch` (pnpm patch for the docs font installer) | — not needed (no font installer) |

## 10. Skills — `skills/`

| VueUse                                                    | reause                                                                                                                                                                                                             | status                      |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------- |
| `skills/vueuse-functions/SKILL.md` + `references/<fn>.md` | [`skills/reause-functions/SKILL.md`](https://github.com/hairyf/reause/blob/main/skills/reause-functions/SKILL.md) + [`references/`](https://github.com/hairyf/reause/tree/main/skills/reause-functions/references) | ✅ (hand-maintained subset) |
| `packages/skills/build.ts` (auto-generates the skill)     | [`packages/skills/build.ts`](https://github.com/hairyf/reause/blob/main/packages/skills/build.ts)                                                                                                                  | ✅                          |

## 11. Root tooling & config files

| VueUse                                                    | purpose                                                                                                         | reause                                                                                                                       |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `package.json` + `pnpm-workspace.yaml` + `pnpm-lock.yaml` | monorepo (pnpm)                                                                                                 | `package.json` + `pnpm-workspace.yaml` + `pnpm-lock.yaml` (pnpm — same as upstream) ✅                                       |
| `tsconfig.json`                                           | TS config                                                                                                       | ✅                                                                                                                           |
| `turbo.json`                                              | task orchestration                                                                                              | ✅                                                                                                                           |
| `tsdown.config.ts`                                        | package bundling                                                                                                | ✅ (root helper + per-package configs)                                                                                       |
| `vitest.config.ts`                                        | test config                                                                                                     | ✅                                                                                                                           |
| `eslint.config.js`                                        | linting (flat config)                                                                                           | ✅ — `@antfu/eslint-config` (same as VueUse)                                                                                 |
| `taze.config.ts`                                          | dependency updates                                                                                              | ✅                                                                                                                           |
| `netlify.toml`                                            | docs site deploy                                                                                                | ✅                                                                                                                           |
| `.editorconfig`                                           | editor style                                                                                                    | ✅                                                                                                                           |
| `.gitignore` / `.gitattributes`                           | git hygiene                                                                                                     | ✅                                                                                                                           |
| `.vscode/`                                                | editor workspace settings                                                                                       | ✅ [`extensions.json`](https://github.com/hairyf/reause/blob/main/.vscode/extensions.json) + `settings.json` + `launch.json` |
| `simple-git-hooks` + `lint-staged` (in `package.json`)    | git hooks — `prepare: simple-git-hooks`, `pre-commit: npx lint-staged` → `eslint --cache --fix` on staged files | ✅                                                                                                                           |
| `unocss.config.ts`                                        | docs styling                                                                                                    | — default VitePress theme instead ([decision](#mapping-decisions))                                                           |

## 12. Community & legal

| VueUse               | reause       |
| -------------------- | ------------ |
| `README.md`          | ✅ (English) |
| `LICENSE` (MIT)      | ✅ (MIT)     |
| `CONTRIBUTING.md`    | ✅           |
| `CODE_OF_CONDUCT.md` | ✅           |

## 13. Non-VueUse sources

Everything above describes the VueUse mirror, which still defines the package layout. reause also
ports from `react-use`, `react-hookz`, `mantine` and `ahooks`.
Those ports are added to the **existing** packages — there is no package per source:

| source        | pinned tree          | lands in                         | how it is ported                                      |
| ------------- | -------------------- | -------------------------------- | ----------------------------------------------------- |
| `react-use`   | `source/react-use`   | `@reause/shared`, `@reause/core` | direct mirror — upstream names and return shapes kept |
| `react-hookz` | `source/react-hookz` | `@reause/shared`                 | direct mirror                                         |
| `mantine`     | `source/mantine`     | `@reause/core`, `@reause/shared` | direct mirror, detached from `@mantine/core`          |
| `ahooks`      | `source/ahooks`      | `@reause/shared`, `@reause/core` | direct mirror with documented renames                 |

- **Provenance convention:** a port declares its upstream with `` Map from <source> `<upstream-symbol>` `` in its JSDoc. That explicit form is what [`meta/functions.md`](https://github.com/hairyf/reause/blob/main/meta/functions.md) resolves for every source; the prose form (`` React port of VueUse's `<symbol>` ``) stays VueUse-only by design, so a non-VueUse port must carry the annotation. Per-source naming and return-value rules are in [AGENTS.md](https://github.com/hairyf/reause/blob/main/AGENTS.md) §1.
- **One monitored source:** only `source/vueuse` is polled for upstream updates; the other checkouts are provenance-only and are read solely to resolve a port's own annotation ([docs/upstream-monitoring.md](https://github.com/hairyf/reause/blob/main/docs/upstream-monitoring.md) §1).
- **Not yet a source:** a `source/usehooks` checkout is mounted, but it has no ports yet and is therefore absent from the registry's source ids.

## Mapping decisions

- **Runtime API mapping (conceptual):** Vue's `ref()`/`reactive()` → React `useState()`; `watch()`/`watchEffect()` → `useEffect()`; `computed()` → `useMemo()`/`useCallback()`; composable teardown → effect cleanup on unmount.
- **Per-source pinned trees:** every port is checked against the pinned checkout of the source its `Map from` annotation names — `source/vueuse`, `source/react-use`, `source/react-hookz`, `source/mantine` or `source/ahooks`. Placement follows the source: `useToggle`/`useCounter` live in `@reause/shared` because upstream has them in `@vueuse/shared`.
- **Docs metadata driven:** function lists/registry are generated by `npm run update` (mirroring VueUse's pipeline): `meta/functions.md` (mapping table), `packages/functions.md` (docs page), `packages/metadata/src/functions.ts` (registry).
- **Test framework:** vitest-browser-react (browser mode) instead of React Testing Library — real-browser hook tests, mirroring VueUse's vitest browser project.
- **Docs + React:** VitePress (Vue-based) with React demos mounted client-side via a `DemoContainer` Vue component; docs styling uses the default theme (no unocss).
- **Package manager:** pnpm, mirroring upstream — `packageManager: pnpm@11.25.0`, the workspace declared in `pnpm-workspace.yaml` (`packages/*`, `playgrounds/*`) and locked by `pnpm-lock.yaml`, with scripts that call `pnpm -r` / `pnpm --filter`.
- **Linting:** `@antfu/eslint-config` (the exact config VueUse uses), with self-import guards scoped per package.
- **Source layout:** `packages/<pkg>/<fn>/index.tsx` — docs, demos and tests stay co-located per function at `packages/<pkg>/<fn>/`, exactly like upstream.

## Status notes

The **VueUse** mirror covers the map above: every `@vueuse/core` function is either ported or closed as intentionally impractical (27 Vue-only `ref` / reactivity APIs, [audit](https://github.com/hairyf/reause/blob/main/docs/upstream-monitoring.md)), and the only unmapped surface is `@vueuse/components`. The non-VueUse sources (§13) are an open, growing set ported on their own terms — no completeness is claimed for them. The generated [`meta/functions.md`](https://github.com/hairyf/reause/blob/main/meta/functions.md) is export-driven, so it is a port registry rather than a coverage proof; since [#915](https://github.com/hairyf/reause/issues/915) it also records the source each export came from.

1. **Large-scale AI mapping** of all `@vueuse/core` functions — complete: [`meta/functions.md`](https://github.com/hairyf/reause/blob/main/meta/functions.md) lists every mapped export with the source it came from (348 rows at the time of writing: 335 resolved to a module in their own source's pin, 3 resolved outside the pinned submodule, 10 reause-only exports such as `isRefLike` or `writeState`).
2. **`rxjs` / `electron` / `firebase` / `skills` sub-packages** — created and mapped: [`packages/rxjs`](https://github.com/hairyf/reause/tree/main/packages/rxjs), [`packages/electron`](https://github.com/hairyf/reause/tree/main/packages/electron), [`packages/firebase`](https://github.com/hairyf/reause/tree/main/packages/firebase), [`packages/skills`](https://github.com/hairyf/reause/tree/main/packages/skills).
3. **Publishing to npm (`@reause/*`)** — the `publish.yml` workflow and `publish:ci` script publish through npm **trusted publishing** (OIDC, no token). `v0.1.4` is the current release: all nine published `@reause/*` packages are at `0.1.4` with SLSA provenance, and the Trusted Publisher entries (repo `hairyf/reause`, workflow `publish.yml`) are configured on npmjs.com. The other prerequisite is that every published `package.json` carries a `repository` field whose URL normalises to `https://github.com/hairyf/reause` — OIDC alone is not enough, since npm rejects the upload with `E422 … Error verifying sigstore provenance bundle` otherwise ([release prerequisites](https://github.com/hairyf/reause/blob/main/docs/release.md)).
4. **`components` package** — ⏳ TODO: the renderless component surface of `@vueuse/components` is not mapped yet ([Components](/guide/components)).
