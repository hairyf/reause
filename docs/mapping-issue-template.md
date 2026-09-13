# Mapping Issue Template — VueUse → reause

One issue per upstream function. The single source of truth is the
[`source/vueuse`](https://github.com/hairyf/reause/tree/main/source/vueuse) submodule (upstream VueUse, pinned commit).

Each issue tracks the 1:1 React port of one VueUse function:
implementation, test, docs, demo, and API-parity review.

## Title

```
Mapping | `<fnName>` | <short description>
```

The package is carried by the `@reaxuse/<pkg>` label, not the title.

Examples:

- `Mapping | \`useNow\` | Reactive current Date instance`
- `Mapping | \`useToggle\` | A boolean switcher with utility functions`

> The label/package name always follows the **upstream** package of the function.
> If the reause implementation lives in a different package, that deviation is
> flagged in the body (see [ported hooks](#ported-hooks)).

## Labels

Every mapping issue carries exactly two labels, plus optional extras:

| Label                         | Rule                                                  |
| ----------------------------- | ----------------------------------------------------- |
| `@reaxuse/<pkg>`              | upstream package of the function (always)             |
| `size:<XS\|S\|M\|L\|XL\|XXL>` | from upstream `index.ts` LOC — see [Size](#size-rule) |
| `good first issue`            | optional — add for `size:S` or below                  |

No new labels are required; `@reaxuse/*` and `size:*` already exist in the repo.

> **The label prefix is the legacy `@reaxuse/*`, not the package scope `@reause/*`.**
> The package scope is `@reause/*` but the labels predate the rename and were never
> updated, so a `@reause/<pkg>` label does not exist — `gh issue create` then fails
> with `could not add label: '@reause/core' not found` (exit 1). Confirm the current
> names first and use exactly what the command prints:

```bash
gh label list --repo hairyf/reause --limit 40
```

## Body

````markdown
## Target

- **VueUse**: `useNow` — package `@vueuse/core` — [docs](https://vueuse.org/core/useNow/) — source `source/vueuse/packages/core/useNow`
- **reause**: `packages/core/useNow/index.tsx`, exported from `@reause/core`
- **Status**: ☐ todo · ☐ in progress · ☐ done

## Upstream API

<!-- extracted from upstream index.ts + index.md frontmatter -->

- **Options**: `{ controls?: boolean, scheduler?: (cb: () => void) => Pausable }`
- **Returns**: `Date` — or `{ now, isActive, pause, resume }` when `controls: true`
- **Variants**: component `UseNow` / directive `v-*` (only if present upstream)

## Mapping files

<!-- the exact upstream files this port is mapped FROM (resolved per function) -->

Map from (`source/vueuse/packages/core/useNow/`):

- `index.ts` — main implementation (50 LOC — total lines)
- `index.browser.test.ts` — upstream tests to mirror
- `component.ts` / `directive.ts` / `demo.vue` — only when present

Map to (reause):

- `packages/core/useNow/index.tsx` — implementation
- `packages/core/useNow/index.test.tsx` — mirrored tests (vitest-browser-react)
- `packages/core/useNow/index.md` + `packages/core/useNow/demo.tsx` — docs page + demo (co-located per function, mirroring upstream)

## Expected implementation

<!-- COMPLETED DYNAMICALLY during mapping (not generated): the full
     side-by-side implementation. The VueUse side below is prefilled from
     upstream docs; the reause side must be written by the mapper — it
     generally mirrors the VueUse shape 1:1, but React differences
     (state/effect/refs, SSR, options handling) are expected and should be
     reflected here. -->

```tsx
// vueuse — @vueuse/core
const now = useNow()

// reause — @reause/core
const now = useNow()
```
````

> **This section is completed dynamically during mapping** — it is not
> auto-generated. The VueUse side is prefilled from upstream docs; the
> reause side is written by the mapper (it generally matches the VueUse
> shape, with React differences documented inline).

General conventions to apply (from [`packages/guide/architecture.md`](../packages/guide/architecture.md) § Mapping decisions):

```tsx
// vueuse                    // reause (expected)
// watch()         →  useWatch()          // or useEffect when no reactive deps
// computed()      →  useMemo()
// ref()           →  useState()
// watchEffect()   →  useEffect()
// composable teardown → effect cleanup on unmount
```

## Mapping notes

<!-- React-flavored mapping decisions for THIS function only -->

- deviations from upstream API, SSR / browser-only concerns
- external dependencies (e.g. axios, firebase, drauu) and how to keep them optional
- package-placement deviations (upstream pkg → different reause pkg)

## Acceptance criteria

- [ ] DOM / element target parameters follow the binding standard in
      [`AGENTS.md`](../AGENTS.md) §2 — a single target is `RefOrValue<T>`; a
      multi-target array is accepted in either wrapping
      (`RefOrValue<Arrayable<T>>` as in `useEventListener`, or `RefOrValue<T>[]`
      as in `useClickAway`), the only requirement being that **every element has
      the same type `T`**. The upstream permissive target type (e.g. ahooks
      `BasicTarget | BasicTarget[]`) is **not** mirrored: §2 wins over §1.1's
      direct-mirror rule for parameter _types_
- [ ] when upstream takes multiple targets, the docs/demo show the
      multi-target form and state the homogeneous-`T` limit; when it does not,
      a single target is used
- [ ] implementation `packages/<pkg>/<fn>/index.tsx` + one barrel line `export * from './<fn>'` in `packages/<pkg>/index.ts`
- [ ] test `packages/<pkg>/<fn>/index.test.tsx` (vitest-browser-react), mirroring the upstream test files
- [ ] docs page `packages/<pkg>/<fn>/index.md` + co-located demo `packages/<pkg>/<fn>/demo.tsx`
- [ ] docs page references the upstream mapping files (source + tests)
- [ ] metadata trio (`meta/functions.md`, `packages/functions.md`, `packages/metadata/src/functions.ts`) left untouched — the orchestrator regenerates it after merge

## Size estimate

- upstream `index.ts` LOC: `50` — total lines, counted with
  `(Get-Content <file>).Count` → **`size:M`**
- factors: browser-only APIs · external deps · component/directive variants

## Ported hooks

Already-ported functions still get an issue, kept open as a **review/completion
tracker** — tick the acceptance items that exist and list the remaining gaps
honestly instead of pre-marking done. Example:

- `useTimeAgo` is implemented (`packages/core/useTimeAgo/index.tsx`) with test,
  docs and demo. Upstream's `controls: true` variant is not ported — the port
  returns a plain `string`, dropping the `Controls` generic, while upstream
  returns `{ timeAgo, isActive, pause, resume }`
  (`source/vueuse/packages/core/useTimeAgo/index.ts`). The divergence is
  **recorded, not overlooked** — "Divergences from upstream" at
  `packages/core/useTimeAgo/index.tsx` L196-198, "intentionally not ported,
  consistent with `useTimeAgo`" at `packages/core/useTimeAgoIntl/index.tsx`
  L78-79 — so the tracker carries it to confirm the decision or schedule the
  port; `useNow` already returns the same `Pausable` shape
  (`packages/core/useNow/index.tsx`), so porting is feasible.
- `useToggle` / `useCounter` upstream live in `@vueuse/shared` and are
  implemented in `@reause/shared` — package placement matches upstream.

## Size rule

Measured on `source/vueuse/packages/<pkg>/<fn>/index.ts`, reusing the existing
`size:*` label ranges:

| size       | upstream `index.ts` LOC |
| ---------- | ----------------------- |
| `size:XS`  | 0–9                     |
| `size:S`   | 10–29                   |
| `size:M`   | 30–99                   |
| `size:L`   | 100–499                 |
| `size:XL`  | 500–999                 |
| `size:XXL` | 1000+                   |

Special case: `source/vueuse/packages/shared/utils` (internal utility folder,
no per-function docs) → **one** issue covering the whole group, `size:XXL`.

## Creation

Issues are created with the GitHub CLI against `hairyf/reause`:

```bash
gh issue create \
  --repo hairyf/reause \
  --title 'Mapping | `useNow` | Reactive current Date instance' \
  --label "@reaxuse/core,size:M" \
  --body-file <rendered-body.md>
```

`--label` must match the names the repository actually carries — confirm them with
`gh label list --repo hairyf/reause --limit 40` first (`@reaxuse/core`, not
`@reause/core`); a missing label aborts the command with
`could not add label: '@reause/core' not found`.

The mapping files are resolved from the `source/vueuse` submodule; LOC/size/labels are
computed per function and this template is rendered per function when creating issues
(dry-run mode first).
