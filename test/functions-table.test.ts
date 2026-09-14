import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import { collectFunctionRows, sourceTrees } from '../scripts/update'

/**
 * Structural guard for the `meta/functions.md` mapping table.
 *
 * The table is generated (`npm run update`) and only regenerated after merge,
 * so the committed copy can lag behind the resolver. The strongest assertion
 * therefore runs the resolver itself over the hook sources; the committed table
 * is additionally checked for the invariants that hold no matter how stale its
 * status column is.
 *
 * Background (issue #882): the old table resolved an export's upstream by
 * probing `source/vueuse/packages/<pkg>/<reause export name>` and nothing else,
 * so every renamed port (`useLongPress`, `useStateHistory`, …) and every
 * secondary export (`breakpointsTailwind`) was mislabelled "no upstream match".
 *
 * Background (issue #915): the resolver then still only understood
 * `@vueuse/<pkg>` claims, so a port from any other source read as
 * `✅ reause-only export` — documented as "upstream neither defines nor
 * re-exports this symbol". The three react-use ports proved it, and every
 * `source:react-use` mapping issue after them would have inherited the label.
 */

const root = join(import.meta.dirname, '..')
const upstreamRoot = join(root, 'source/vueuse')
/** `source/vueuse` is an uninitialized submodule in a fresh worktree. */
const upstreamReady = existsSync(join(upstreamRoot, 'packages', 'core'))
/** Every other `source/*` mount is provenance-only and may be missing too. */
const reactUseReady = existsSync(join(root, 'source', 'react-use', 'src'))

/** The statuses `scripts/update.ts` can emit — and only those. */
const STATUS_RE = /^✅ (?:ported|ported \(not in pinned submodule\)|reause-only export)$/

interface TableRow {
  source: string
  symbol: string
  upstream: string
  file: string
  status: string
}

/**
 * Parse the generated table —
 * `| source | \`upstream function\` | source path | \`reause file\` | status |`.
 */
function parseTable(md: string): TableRow[] {
  const rows: TableRow[] = []
  for (const line of md.split('\n')) {
    if (!line.startsWith('| '))
      continue
    const cells = line.split('|').map(cell => cell.trim())
    // Empty edge cells around `source`, `symbol`, `upstream`, `file`, `status`.
    if (cells.length !== 7)
      continue
    // Skip the header and the `---` separator.
    if (cells[1] === 'source' || /^-+$/.test(cells[1]))
      continue
    rows.push({
      source: cells[1],
      symbol: cells[2].replaceAll('`', ''),
      upstream: cells[3],
      file: cells[4].replaceAll('`', ''),
      status: cells[5],
    })
  }
  return rows
}

describe('meta/functions.md resolution', () => {
  const table = parseTable(readFileSync(join(root, 'meta/functions.md'), 'utf-8'))

  it('keeps every hook export as a row, with the header caveat intact', () => {
    // A floor, not an equality: porting another hook legitimately adds rows.
    expect(table.length).toBeGreaterThanOrEqual(310)
    expect(readFileSync(join(root, 'meta/functions.md'), 'utf-8'))
      .toContain('port registry, not a coverage proof')
  })

  it('carries 202+ real upstream paths (not the same-name-directory probe)', () => {
    // The probe this issue removed could only ever resolve 202 of 310 rows.
    const withPath = table.filter(row => row.upstream !== '—')
    expect(withPath.length).toBeGreaterThanOrEqual(202)
  })

  it('names a source for every resolved row and `—` for a pure reause-only export', () => {
    for (const row of table) {
      if (row.source === '—')
        expect(row.upstream, `${row.symbol} has no source but a path`).toBe('—')
      else
        expect(row.source, row.symbol).not.toBe('')
    }
  })

  it('labels every row ported, outside-the-pin, or reause-only', () => {
    // Exactly the statuses `scripts/update.ts` can emit. The retired
    // `ported (no upstream match)` label is deliberately *not* accepted here: it
    // is what the removed same-name-directory probe reported for every renamed
    // or secondary export (issue #882), so accepting it would let that
    // regression pass silently.
    for (const row of table) {
      expect(row.status).toMatch(STATUS_RE)
      // The same hole, asserted as its own failure with a readable message
      // rather than only as the absence of a regex match above.
      expect(row.status, `${row.symbol} carries the retired probe status`).not.toContain('no upstream match')
      // A `—` upstream column and a resolved path are mutually exclusive; only
      // the `reause-only` and outside-the-pin statuses may carry it.
      if (row.status === '✅ reause-only export' || row.status === '✅ ported (not in pinned submodule)')
        expect(row.upstream).toBe('—')
      if (row.status === '✅ ported')
        expect(row.upstream).not.toBe('—')
      // Only a reause-only export has nothing upstream at all.
      if (row.status === '✅ reause-only export')
        expect(row.source, row.symbol).toBe('—')
      else
        expect(row.source, row.symbol).not.toBe('—')
    }
  })

  it('never renders an export of a non-VueUse source as a reause-only export', () => {
    // Issue #915: `useMount` / `useUnmount` / `useUpdate` each carry an explicit
    // `Map from react-use \`<name>\`` marker, yet the VueUse-only parser rendered
    // all three as `✅ reause-only export` — the label documented as "upstream
    // neither defines nor re-exports this symbol".
    const nonVueuse = table.filter(row => row.source !== '—' && row.source !== 'vueuse')
    expect(nonVueuse.length).toBeGreaterThanOrEqual(3)
    for (const row of nonVueuse)
      expect(row.status, `${row.source} ${row.symbol}`).not.toBe('✅ reause-only export')

    // The three ports that exposed the bug, resolved against react-use's own
    // pinned tree (flat `src/<name>.ts`) rather than the VueUse pin.
    for (const [name, upstream] of [
      ['useMount', 'src/useMount.ts'],
      ['useUnmount', 'src/useUnmount.ts'],
      ['useUpdate', 'src/useUpdate.ts'],
    ] as const) {
      const row = table.find(candidate => candidate.file === `packages/shared/${name}/index.tsx`)
      expect(row, name).toBeDefined()
      expect(row!.source, name).toBe('react-use')
      expect(row!.symbol, name).toBe(name)
      expect(row!.upstream, name).toBe(upstream)
      expect(row!.status, name).toBe('✅ ported')
    }

    // A pure reause-only export is unaffected: no source, no path, same status.
    const useConst = table.find(row => row.file === 'packages/shared/useConst/index.tsx')
    expect(useConst?.source).toBe('—')
    expect(useConst?.upstream).toBe('—')
    expect(useConst?.status).toBe('✅ reause-only export')
  })

  describe.skipIf(!upstreamReady)('against the pinned upstream checkout', () => {
    // Resolving scans every hook source and the upstream tree once; share it
    // across the assertions below.
    let rows: ReturnType<typeof collectFunctionRows>
    beforeAll(() => {
      rows = collectFunctionRows()
    })

    it('resolves every real upstream path to a module in that row\'s own pinned source', () => {
      for (const row of table.filter(r => r.upstream !== '—')) {
        const tree = sourceTrees[row.source]
        expect(tree, `${row.symbol} names source ${row.source}, which has no pinned tree`).toBeDefined()
        expect(existsSync(join(root, tree!, row.upstream)), `${row.symbol} → ${row.source}/${row.upstream}`).toBe(true)
      }
    })

    it('never labels an export reause-only when its own annotation names a real upstream', () => {
      for (const row of rows.filter(r => !r.upstream && r.missingFrom === 'reause-only'))
        expect(row.claimConfirmed, `${row.name} claims ${row.claimed} but is reause-only`).toBe(false)
      // A non-VueUse claim must never collapse to `reause-only` either: the
      // resolver keeps it as `unconfirmed-claim` at worst, so the label keeps
      // meaning "reause invented this symbol".
      for (const row of rows.filter(r => r.source && r.source !== 'vueuse'))
        expect(row.missingFrom, `${row.name} claims ${row.source}`).not.toBe('reause-only')
    })

    it('does not call a Vue API or a post-pin hook reause-only', () => {
      const missingFrom = (name: string) => rows.find(row => row.name === name)?.missingFrom
      // VueUse surfaces `toValue` from `vue`; `watch` likewise. `useWebMCP`
      // postdates the frozen pin (docs/upstream-monitoring.md §3.1). None of
      // them were invented here, so none may read as `reause-only export`.
      expect(missingFrom('toValue')).toBe('vue-api')
      expect(missingFrom('useWatch')).toBe('unconfirmed-claim')
      expect(missingFrom('useWebMCP')).toBe('unconfirmed-claim')
      // Genuinely reause-invented helpers, by contrast, are reause-only and
      // carry no upstream source at all.
      for (const name of ['isRefLike', 'writeState', 'deepClone', 'deepEqual', 'useListener'])
        expect(missingFrom(name), name).toBe('reause-only')
      expect(rows.find(row => row.name === 'useConst')?.source).toBeUndefined()
    })

    it('resolves renamed ports to their annotated upstream, not to a missing same-name dir', () => {
      const upstreamOf = (name: string) => rows.find(row => row.name === name)?.upstream
      const sourceOf = (name: string) => rows.find(row => row.name === name)?.source
      // `on*` → `use*` and `ref*`/`use*Ref*` → `useState*` renames (AGENTS.md §1.2).
      expect(upstreamOf('useLongPress')).toBe('packages/core/onLongPress')
      // A renamed port shows both names: the upstream symbol and its own file.
      expect(rows.find(row => row.name === 'useLongPress')?.symbol).toBe('onLongPress')
      expect(upstreamOf('useStartTyping')).toBe('packages/core/onStartTyping')
      expect(upstreamOf('useKeyStroke')).toBe('packages/core/onKeyStroke')
      expect(upstreamOf('useStateHistory')).toBe('packages/core/useRefHistory')
      expect(upstreamOf('useStateAutoReset')).toBe('packages/shared/refAutoReset')
      expect(upstreamOf('syncState')).toBe('packages/shared/syncRef')
      expect(upstreamOf('createSharedHook')).toBe('packages/shared/createSharedComposable')
      // A helper whose upstream module is the package root, not a per-symbol
      // dir: `toArgsFlat` ← `toValueArgsFlat`, defined in `packages/math/utils.ts`
      // (a root-level file, so the module keys as `packages/math`). The port
      // used to phrase this as unrecognized prose (`Mirrors VueUse math's …`),
      // which no `parseClaims` form matched, so it read as reause-only (#910).
      expect(upstreamOf('toArgsFlat')).toBe('packages/math')
      // Secondary exports of a VueUse-derived page (defined in a module, not a dir).
      expect(upstreamOf('breakpointsTailwind')).toBe('packages/core/useBreakpoints')
      expect(upstreamOf('createCookies')).toBe('packages/integrations/useCookies')
      expect(upstreamOf('mapGamepadToXbox360Controller')).toBe('packages/core/useGamepad')
      // Re-exports of upstream `shared/utils` (one barrel, no per-symbol dirs).
      expect(upstreamOf('clamp')).toBe('packages/shared/utils')
      expect(upstreamOf('noop')).toBe('packages/shared/utils')
      // Every port that names no other source stays VueUse's.
      expect(sourceOf('useLongPress')).toBe('vueuse')
      expect(sourceOf('breakpointsTailwind')).toBe('vueuse')
      // Genuinely reause-invented helpers keep an honest `—`.
      expect(upstreamOf('isRefLike')).toBeUndefined()
      expect(upstreamOf('writeState')).toBeUndefined()
      expect(sourceOf('isRefLike')).toBeUndefined()
    })

    it('resolves a large majority of rows, so a collapse to reause-only fails loudly', () => {
      const resolved = rows.filter(row => row.upstream)
      // 295 of 310 at the time of the fix; the floor catches a regression that
      // silently re-breaks the annotation or page routes rather than the odd row.
      expect(resolved.length).toBeGreaterThanOrEqual(285)
      expect(rows.length - resolved.length).toBeLessThanOrEqual(25)
    })

    describe.skipIf(!reactUseReady)('with the react-use pin present (issue #915)', () => {
      it('resolves the three existing react-use ports against react-use, not VueUse', () => {
        for (const name of ['useMount', 'useUnmount', 'useUpdate']) {
          const row = rows.find(candidate => candidate.name === name)!
          expect(row.source, name).toBe('react-use')
          expect(row.upstream, name).toBe(`src/${name}.ts`)
          expect(row.symbol, name).toBe(name)
          expect(row.missingFrom, name).toBeUndefined()
        }
      })

      it('still resolves VueUse ports to vueuse, so the registry did not shift them', () => {
        for (const name of ['useNow', 'useLongPress', 'clamp']) {
          const row = rows.find(candidate => candidate.name === name)!
          expect(row.source, name).toBe('vueuse')
        }
      })
    })
  })
})
