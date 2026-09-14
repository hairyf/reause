import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { format } from 'prettier'
import { globSync } from 'tinyglobby'
import { root } from './utils'

interface MappedFunction {
  name: string
  file: string
  pkg: string
  /** Docs-page directory (`packages/<pkg>/<page>`), shared by every export of that page. */
  dir: string
  /** Docs-page category, read from the co-located index.md frontmatter. */
  category: string
  /** Last commit unix-ms touching the hook source file (for `sort=updated`). */
  lastUpdated?: number
  /**
   * Resolved upstream module (`packages/<pkg>/<dir>`), or `undefined` when no
   * module in the pinned submodule has the export (see `missingFrom`). Resolved
   * per *export* (see `resolveExport`), never by the same-name-directory probe
   * alone — a renamed port (`useLongPress` ← `onLongPress`) or a secondary
   * export of a page (`breakpointsTailwind` ← `useBreakpoints`) must not read as
   * "no upstream". Only consumed by `meta/functions.md`.
   */
  upstream?: string
}

/**
 * Page-level view of the registry — the reause analogue of VueUse's
 * `metadata.functions`, which is keyed by function *directory*
 * (`packages/<package>/<name>/`) rather than by exported symbol. Every
 * export of a page (`useBreakpoints` + `breakpointsTailwind` + …) collapses
 * onto a single entry here, which is what the generated agent skill
 * (`packages/skills/build.ts`) consumes.
 */
interface MappedPage {
  name: string
  pkg: string
  /** Docs page, relative to the repo root (`packages/<pkg>/<page>/index.md`). */
  doc: string
  category: string
  description: string
  /** Not part of the public surface — mirrors VueUse's `listFunctions` `_*` ignore. */
  internal?: boolean
  lastUpdated?: number
  /** Alternate export names, from the page frontmatter's `alias` (VueUse parity). */
  alias?: string[]
  /** Related pages, from the page frontmatter's `related` plus the interop pass. */
  related?: string[]
}

const RE_EXPORT = /export\s+(?:async\s+)?function\s+(\w+)|export\s+const\s+(\w+)\s*=/g

/**
 * One upstream source reause ports from (issue #915). Every source is a pinned
 * read-only checkout under `source/*`, read for provenance.
 *
 * The trees are shaped differently per source, which is why each entry declares
 * its own marker, file glob and module key rather than sharing one probe:
 * VueUse keys modules by directory (`packages/core/useNow`), react-use is flat
 * (`src/useMount.ts`), react-hookz is `src/<name>/index.ts`, mantine is
 * kebab-cased (`packages/@mantine/hooks/src/use-collapse/`) and ahooks is
 * `packages/hooks/src/<name>/index.ts`.
 */
interface UpstreamSource {
  /** Source id, as rendered in the table's `source` column and `meta/functions.ts`. */
  id: string
  /**
   * Token a `Map from` annotation uses for this source, matched from the token
   * right after `Map from`. Capture group 1, when present, is the package
   * qualifier (`@vueuse/core` → `core`).
   */
  marker: RegExp
  /** Pinned checkout under the repo root. */
  tree: string
  /** The export-defining files under `tree`. */
  files: string[]
  /**
   * How a file keys its module: `dir` when one directory is one module
   * (`packages/core/useNow`, `src/useMap`), `file` for a flat layout
   * (react-use's `src/useMount.ts`).
   */
  modulePer: 'dir' | 'file'
  /**
   * Candidate module paths for a bare `` `symbol` `` claim, confirmed against
   * the pin like every other candidate — never assumed to exist.
   */
  modulesOf?: (qualifier: string | undefined, symbol: string) => string[]
}

const SOURCES: UpstreamSource[] = [
  {
    id: 'vueuse',
    marker: /@vueuse\/([a-z0-9-]+)/,
    tree: 'source/vueuse',
    files: ['packages/{shared,core,integrations,math,rxjs,electron,firebase,router}/**/*.ts'],
    modulePer: 'dir',
    modulesOf: (pkg, symbol) => pkg ? [`packages/${pkg}/${symbol.replace(/\.ts$/, '')}`] : [],
  },
  {
    id: 'react-use',
    marker: /\breact-use\b/,
    tree: 'source/react-use',
    files: ['src/**/*.{ts,tsx}'],
    modulePer: 'file',
    modulesOf: (_pkg, symbol) => {
      const name = symbol.replace(/\.tsx?$/, '')
      return [`src/${name}.ts`, `src/${name}.tsx`]
    },
  },
  {
    id: 'react-hookz',
    marker: /\breact-hookz\b/,
    tree: 'source/react-hookz',
    files: ['src/**/*.{ts,tsx}'],
    modulePer: 'dir',
    modulesOf: (_pkg, symbol) => [`src/${symbol}`],
  },
  {
    id: 'mantine',
    marker: /@mantine\/hooks/,
    tree: 'source/mantine',
    files: ['packages/@mantine/hooks/src/**/*.{ts,tsx}'],
    modulePer: 'dir',
    modulesOf: (_pkg, symbol) => [`packages/@mantine/hooks/src/${kebabCase(symbol)}`],
  },
  {
    id: 'ahooks',
    marker: /\bahooks\b/,
    tree: 'source/ahooks',
    files: ['packages/hooks/src/**/*.{ts,tsx}'],
    modulePer: 'dir',
    modulesOf: (_pkg, symbol) => [`packages/hooks/src/${symbol}`],
  },
]

const SOURCE_BY_ID = new Map(SOURCES.map(source => [source.id, source]))

/**
 * Source id → pinned tree, relative to the repo root. Exported so the
 * structural guard in `test/functions-table.test.ts` resolves each committed row
 * against its own pin rather than assuming `source/vueuse`.
 */
export const sourceTrees: Record<string, string> = Object.fromEntries(
  SOURCES.map(source => [source.id, source.tree]),
)

/** `useCollapse` → `use-collapse` (mantine's per-hook directory naming). */
function kebabCase(name: string) {
  return name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
}

/** One provenance claim a hook source makes about an export. */
interface UpstreamClaim {
  /** Source id the claim names (see `SOURCES`). */
  source: string
  /**
   * Pin-relative upstream module the claim names, or `''` when the claim only
   * names a symbol (the `React port of VueUse's \`x\`` prose form, and a `Map
   * from` claim on a source with no pinned tree).
   */
  module: string
  /** Upstream symbol the claim names. */
  symbol: string
  /** The marker's package qualifier, when it has one (`@vueuse/core` → `core`). */
  qualifier?: string
  /** Offset of the claim in its source file, to pair it with an export. */
  offset: number
}

// Every `Map from` annotation, whatever source it names. The window is the rest
// of the annotation line plus the next one, so an explicit
// `(source/<id>/<module>)` reference on the following line is seen too. A
// window that names no registered source (e.g. reause's own
// `Map from @reause/shared \`useListener\``) is skipped by `matchSource`, so
// widening this pattern from `@vueuse/` changes no VueUse resolution.
const RE_MAP_FROM = /Map from [^\n]*(?:\n[^\n]*)?/g

// The prose form stays VueUse-only — a deliberate decision recorded in issue
// #915 rather than an oversight. It names no source token at all ("React port of
// VueUse's `x`"), so generalising it would mean inventing per-source prose
// spellings ("Mantine's", "ahooks's") that no port uses. Every non-VueUse port
// must therefore carry the explicit `Map from <marker> \`<name>\`` annotation,
// which the registry resolves against that source's own pinned tree; the prose
// branch in `resolveExport` searches the pin only for `source: 'vueuse'`.
const RE_PROSE_PORT = /port of VueUse's `([A-Z_]\w*)`/gi

/**
 * The source a `Map from` window names, and the marker that names it. The
 * earliest marker wins, so a line that happens to mention two source ids still
 * resolves to the one beginning the claim.
 */
function matchSource(window: string): { source: UpstreamSource, index: number, length: number, qualifier?: string } | undefined {
  let hit: { source: UpstreamSource, index: number, length: number, qualifier?: string } | undefined
  for (const source of SOURCES) {
    const match = window.match(source.marker)
    if (!match || match.index === undefined)
      continue
    if (!hit || match.index < hit.index)
      hit = { source, index: match.index, length: match[0].length, qualifier: match[1] }
  }
  return hit
}

/**
 * The literal `source/<tree>/<path>` reference a claim may carry next to its
 * marker (`` (`source/vueuse/packages/core/useNow/`) ``), normalized to the
 * module path the table renders. VueUse's documented form is the two-segment
 * module directory — the exact shape the pre-registry parser read — while the
 * other trees are flatter, so their reference is taken whole.
 */
function claimedPath(source: UpstreamSource, window: string): string | undefined {
  if (!source.tree)
    return undefined
  if (source.id === 'vueuse') {
    const match = window.match(/source\/vueuse\/packages\/([a-z0-9-]+)\/([\w-]+)/)
    return match ? `packages/${match[1]}/${match[2]}` : undefined
  }
  const dir = source.tree.replace(/^source\//, '')
  const match = window.match(new RegExp(`source/${dir}/([\\w@./-]+)`))
  if (!match)
    return undefined
  return match[1].replace(/\/$/, '').replace(/\/index\.tsx?$/, '')
}

/**
 * Every provenance claim a hook file makes, in source order: the
 * `Map from <marker> \`<name>\`` form reause documents ports with (for VueUse
 * also the explicit `source/vueuse/packages/<pkg>/<name>` path form, the slash
 * form `@vueuse/firebase/useAuth` and the bare form `@vueuse/shared watchOnce`;
 * for the other sources the marker alone names the pinned tree), plus the
 * VueUse-only `React port of VueUse's \`<name>\`` prose form some hooks use
 * instead. A file may claim several upstreams (one per export —
 * `useKeyStroke`'s file claims `onKeyStroke`, `onKeyDown`, `onKeyPressed` and
 * `onKeyUp`), so claims keep their offsets and `resolveExport` pairs each with
 * its own export.
 */
function parseClaims(content: string): UpstreamClaim[] {
  const claims: UpstreamClaim[] = []
  // The `Map from` marker sits in a JSDoc `*` line; read to the end of that
  // line, plus the next line so a following explicit
  // `(source/<source>/<path>)` reference is seen too.
  for (const match of content.matchAll(RE_MAP_FROM)) {
    const window = match[0]
    const found = matchSource(window)
    if (!found)
      continue
    const { source, qualifier } = found
    // The symbol is the token the marker is followed by — `` `onLongPress` ``,
    // `/useAuth` or ` watchOnce`. Read it from that position only: a later
    // backticked mention is context, not the claim (`useWatchPausable` says
    // "Map from @vueuse/shared watchPausable. Upstream wraps `watchWithFilter`"),
    // so scanning the whole window would claim the wrong upstream.
    const tail = window.slice(found.index + found.length)
    const token = tail.match(/^\s*`([A-Z_][\w.]*)`/i)?.[1]
      || tail.match(/^\/([\w-]+)/)?.[1]
      || tail.match(/^\s+([\w-]+)/)?.[1]
    const path = claimedPath(source, window)
    const derived = path || (token && source.modulesOf ? source.modulesOf(qualifier, token)[0] : '')
    claims.push({
      source: source.id,
      qualifier,
      module: derived || '',
      symbol: token || (path ? path.split('/').pop()! : ''),
      offset: match.index,
    })
  }
  for (const match of content.matchAll(RE_PROSE_PORT))
    claims.push({ source: 'vueuse', module: '', symbol: match[1], offset: match.index })
  return claims.sort((a, b) => a.offset - b.offset)
}

/**
 * Pair every claim with the export it documents — the first export declared
 * after it. Pairing by offset is what makes a multi-export file resolve per
 * export, and it survives TypeScript overload signatures, which can place the
 * documented implementation *after* the JSDoc block.
 */
function claimsByExport(content: string): Map<string, UpstreamClaim[]> {
  const declarations: { name: string, offset: number }[] = []
  for (const match of content.matchAll(RE_EXPORT))
    declarations.push({ name: match[1] || match[2], offset: match.index })

  const owners = new Map<string, UpstreamClaim[]>()
  for (const claim of parseClaims(content)) {
    const next = declarations.find(declaration => declaration.offset > claim.offset)
    if (!next)
      continue
    const list = owners.get(next.name)
    if (list)
      list.push(claim)
    else
      owners.set(next.name, [claim])
  }
  return owners
}

/**
 * A path relative to a root, slash-normalized (`file` may come from
 * `globSync`, which always reports forward slashes even on Windows).
 */
function relativeTo(rootDir: string, file: string) {
  const dir = rootDir.replace(/\\/g, '/').replace(/\/$/, '')
  return file.replace(/\\/g, '/').replace(`${dir}/`, '')
}

/** The pinned upstream checkout, read-only: `source/vueuse`. */
const UPSTREAM_ROOT = join(root, 'source/vueuse').replace(/\\/g, '/').replace(/\/$/, '')

/**
 * One pinned source's module index: every module path of that source mapped to
 * the files defining it, plus the parsed export names per file.
 */
interface SourceIndex {
  modules: Map<string, string[]>
  exports: Map<string, Set<string>>
}

/** `packages/<pkg>/<dir>` module directories upstream, each mapped to its files. */
let upstreamModules: Map<string, string[]> | undefined
/** Parsed export names per upstream file, filled lazily and shared across lookups. */
const upstreamExports = new Map<string, Set<string>>()

/**
 * Read the upstream tree once and index every module directory against its
 * files: `packages/shared/watchArray/index.ts` and
 * `packages/core/useBreakpoints/breakpoints.ts` both own the directory they
 * live in, so a symbol can be found in the module that actually exports it
 * rather than in a same-name directory that may not exist. `exportsOf` is the
 * shared symbol scanner; every answer is confirmed against the sources.
 *
 * Kept separate from `collectSourceModules` on purpose: this is the VueUse
 * reader the pre-registry resolver used, and routing the other sources through
 * their own globs must not widen the VueUse index.
 */
function collectUpstreamModules() {
  if (upstreamModules)
    return upstreamModules
  const modules = new Map<string, string[]>()
  const files = globSync('packages/{shared,core,integrations,math,rxjs,electron,firebase,router}/**/*.ts', {
    cwd: UPSTREAM_ROOT,
    absolute: true,
    ignore: ['**/*.test.ts'],
  })
  for (const file of files) {
    // The module directory owns its files: `packages/core/useBreakpoints`
    // covers `index.ts` and `breakpoints.ts`, exactly as the table's
    // `source path` column is expected to read.
    const module = relativeTo(UPSTREAM_ROOT, file).split('/').slice(0, -1).join('/')
    const owners = modules.get(module)
    if (owners)
      owners.push(file)
    else
      modules.set(module, [file])
  }
  upstreamModules = modules
  return modules
}

/** Module indexes of the other pinned sources, built lazily once per source. */
const sourceIndexes = new Map<string, SourceIndex>()

/**
 * Index one non-VueUse pinned source, keyed the way that source lays its tree
 * out (`modulePer`): one directory per module for react-hookz / mantine /
 * ahooks, one file per module for react-use's flat `src/`.
 */
function collectSourceModules(source: UpstreamSource): SourceIndex {
  const cached = sourceIndexes.get(source.id)
  if (cached)
    return cached
  const treeRoot = join(root, source.tree).replace(/\\/g, '/').replace(/\/$/, '')
  const modules = new Map<string, string[]>()
  const files = globSync(source.files, {
    cwd: treeRoot,
    absolute: true,
    // Tests, stories and demos never define the public hook.
    ignore: ['**/*.test.*', '**/*.spec.*', '**/*.story.*', '**/*.stories.*', '**/__tests__/**', '**/demo/**'],
  })
  for (const file of files) {
    const rel = relativeTo(treeRoot, file)
    const module = source.modulePer === 'file' ? rel : rel.split('/').slice(0, -1).join('/')
    const owners = modules.get(module)
    if (owners)
      owners.push(file)
    else
      modules.set(module, [file])
  }
  const index: SourceIndex = { modules, exports: new Map() }
  sourceIndexes.set(source.id, index)
  return index
}

/**
 * The module index of a source id. VueUse reuses its own reader unchanged;
 * every other source is read from its own pinned tree.
 */
function indexOf(sourceId: string): SourceIndex {
  const source = SOURCE_BY_ID.get(sourceId)!
  if (sourceId === 'vueuse')
    return { modules: collectUpstreamModules(), exports: upstreamExports }
  return collectSourceModules(source)
}

function exportsOf(content: string): Set<string> {
  const names = new Set<string>()
  for (const match of content.matchAll(/export\s+(?:async\s+)?(?:function|const|let|var|class|interface|type|enum)\s+(\w+)/g))
    names.add(match[1])
  for (const match of content.matchAll(/export\s*\{([^}]*)\}/g)) {
    for (const specifier of match[1].split(',')) {
      // `export { foo as bar }` is exported under `bar`.
      const name = specifier.trim().split(/\s+as\s+/).pop()?.trim() || ''
      if (/^\w+$/.test(name))
        names.add(name)
    }
  }
  // Default exports also carry the upstream name on their declaration:
  // react-use writes `export default useMount` / `export default function
  // useUpdate`, ahooks `export default useRafInterval`. Without this, a claim on
  // such a module could never be confirmed against the pin. An identifier is
  // only counted when the same file declares it, so `export default { … }` and
  // `export default defineConfig(…)` contribute nothing.
  const declared = content.match(/export\s+default\s+(?:async\s+)?function\s+(\w+)/)?.[1]
  if (declared)
    names.add(declared)
  const identifier = content.match(/export\s+default\s+(\w+)\s*(?:;\s*)?$/m)?.[1]
  if (identifier && !['async', 'class', 'function'].includes(identifier)
    && new RegExp(`(?:function|const|let|var|class)\\s+${identifier}\\b`).test(content)) {
    names.add(identifier)
  }
  return names
}

/** Does the pinned `source`'s `module` really export `symbol`? (Never assumed.) */
function moduleExports(sourceId: string, module: string, symbol: string): boolean {
  const index = indexOf(sourceId)
  for (const file of index.modules.get(module) || []) {
    const exports = index.exports.get(file) || exportsOf(readFileSync(file, 'utf-8'))
    index.exports.set(file, exports)
    if (exports.has(symbol))
      return true
  }
  return false
}

/** Symbols upstream imports from `vue` itself, filled lazily. */
let vueApiSymbols: Set<string> | undefined

/**
 * The symbols VueUse takes from `vue` (`toValue`, `isRef`, …) rather than
 * defining. A reause export of one of these has no module in the pinned
 * submodule, but it was not invented here either — VueUse surfaces Vue's own
 * API through its barrel.
 */
function collectVueApiSymbols() {
  if (vueApiSymbols)
    return vueApiSymbols
  const symbols = new Set<string>()
  for (const files of collectUpstreamModules().values()) {
    for (const file of files) {
      const content = readFileSync(file, 'utf-8')
      for (const match of content.matchAll(/import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+['"]vue(?:-demi)?['"]/g)) {
        for (const specifier of match[1].split(',')) {
          const name = specifier.trim().split(/\s+as\s+/).pop()?.trim() || ''
          if (/^\w+$/.test(name))
            symbols.add(name)
        }
      }
    }
  }
  vueApiSymbols = symbols
  return symbols
}

/**
 * The module of `sourceId` exporting `name`, searched in the given module paths
 * (and only those). Shallower directories win, so a symbol that upstream
 * defines in a module file (`packages/core/useBreakpoints`) is preferred over
 * one that only re-exports it from a nested internal directory.
 */
function findModuleIn(sourceId: string, modules: string[], name: string): string | undefined {
  const index = indexOf(sourceId)
  const candidates = modules
    .filter(module => index.modules.has(module))
    .sort((a, b) => a.split('/').length - b.split('/').length || a.localeCompare(b))
  return candidates.find(module => moduleExports(sourceId, module, name))
}

/** VueUse's own lookup, the name the VueUse fallback steps read by. */
function findUpstreamModule(modules: string[], name: string): string | undefined {
  return findModuleIn('vueuse', modules, name)
}

/**
 * The first module of `sourceId` that exports `name` — a symbol scan rather
 * than a path guess, for sources whose directory naming cannot be derived from
 * the symbol (mantine's kebab-cased `use-collapse`) or whose claim named no
 * module at all. Barrel `index.ts` modules sort last so a per-symbol module
 * wins, and shallower modules win over nested internals.
 */
function findSourceModuleBySymbol(sourceId: string, name: string): string | undefined {
  const index = indexOf(sourceId)
  const isBarrel = (module: string) => /(?:^|\/)index\.tsx?$/.test(module) ? 1 : 0
  const modules = [...index.modules.keys()].sort((a, b) =>
    isBarrel(a) - isBarrel(b) || a.split('/').length - b.split('/').length || a.localeCompare(b))
  return modules.find(module => moduleExports(sourceId, module, name))
}

/**
 * The module a bare `` `symbol` `` claim of `sourceId` names, confirmed against
 * that source's pin: the source's own derived paths first (so the table renders
 * the canonical `src/useMount.ts` / `packages/hooks/src/useRafInterval`), then
 * a symbol scan for layouts the derivation cannot guess.
 */
function findClaimedModule(sourceId: string, qualifier: string | undefined, symbol: string): string | undefined {
  const derived = SOURCE_BY_ID.get(sourceId)?.modulesOf?.(qualifier, symbol) || []
  return findModuleIn(sourceId, derived, symbol) || findSourceModuleBySymbol(sourceId, symbol)
}

/**
 * The upstream modules of one reause package (`packages/<pkg>/…`), including
 * the package root itself: `collectUpstreamModules()` keys a file by its
 * dirname, so a root-level file (`packages/math/utils.ts`) keys as
 * `packages/math` — which a trailing-slash prefix alone would exclude, hiding
 * its exports from the symbol search in step 2's prose branch and step 6.
 */
function modulesOfPackage(pkg: string): string[] {
  const prefix = `packages/${pkg}/`
  const rootKey = `packages/${pkg}`
  return [...collectUpstreamModules().keys()].filter(module => module === rootKey || module.startsWith(prefix))
}

/** What one reause export resolves to, and the claim that decided it. */
interface ResolvedExport {
  /**
   * Source id the resolved upstream belongs to (`vueuse`, `react-use`, …), or
   * `undefined` when the export is reause-only.
   */
  source?: string
  /** Resolved upstream module, or `undefined` when the export is reause-only. */
  upstream?: string
  /**
   * Upstream symbol the row names — the port's own annotation when it has one
   * (so a renamed port shows both names), otherwise the reause export name.
   */
  symbol?: string
  /** Upstream module this export's own annotation names, when it names one. */
  claimed?: string
  /** Whether `claimed` exists upstream and really exports the symbol it names. */
  claimConfirmed: boolean
  /**
   * Why no module in the pinned submodule has this export. Only set when
   * `upstream` is undefined, and it is what keeps the label honest: only
   * `reause-only` means "reause invented this symbol".
   */
  missingFrom?: 'unconfirmed-claim' | 'vue-api' | 'reause-only'
}

/**
 * Resolve the real upstream module of one reause export, in order:
 *
 * 1. the claim the port itself makes for this export — its `Map from` (or, for
 *    VueUse, `React port of VueUse's`) annotation, paired by offset — accepted
 *    only when it is materially true (the upstream module exists *and* exports
 *    the symbol the claim names). The claim is resolved against **its own
 *    source's** pinned tree (issue #915), so `Map from react-use \`useMount\``
 *    resolves to `src/useMount.ts` and never to the VueUse pin. This is what
 *    resolves renames (`useLongPress` ← `onLongPress`, `useIntervalRafFn` ←
 *    ahooks' `useRafInterval`), which a same-name-directory probe can never
 *    see;
 * 2. the VueUse prose form, which names a symbol without a package: the
 *    page's own upstream package, then `shared/utils`;
 * 3. another module the file claims that exports this symbol under a different
 *    name (`SSRWidthProvider` is reause's React component for the `useSSRWidth`
 *    page) — same confirmation, never "the module merely exists";
 * 4. any module of a non-VueUse source the file claims (a symbol scan inside
 *    that source only — never the VueUse heuristics below, which would
 *    mislabel a port whose pin does not confirm the claim);
 * 5. the page's upstream directory (`packages/<pkg>/<dir>`), confirmed by an
 *    actual export rather than assumed — covers a page's secondary exports;
 * 6. any upstream module of the page's own package (`breakpointsTailwind` is
 *    defined in `useBreakpoints`, `createCookies` in `useCookies`);
 * 7. upstream `shared/utils`, which has one barrel and no per-symbol dirs
 *    (`clamp`, `noop`, `debounceFilter`, …).
 *
 * Anything left has no module in a pinned submodule — either because the port
 * claims an upstream the pin cannot confirm, or because it is genuinely
 * reause-only (`missingFrom` records which, so the status column never calls a
 * Vue API or a post-pin hook "reause-only", and never calls a non-VueUse port
 * one either). What it never means is "the same-name directory does not exist",
 * which is what the removed probe reported for every renamed and secondary
 * export.
 */
function resolveExport(name: string, pkg: string, dir: string, file: string): ResolvedExport {
  const content = readFileSync(file, 'utf-8')
  const claims = claimsByExport(content)
  const own = claims.get(name) || []
  const all = [...claims.values()].flat()
  // The upstream this export's own annotation names, and whether that claim is
  // materially true — surfaced on the row so the structural guard can assert
  // that a `reause-only` verdict is never contradicted by the port's own claim.
  // A `Map from` that names a module is preferred over the prose form; a
  // non-VueUse marker still counts when no module path could be derived.
  const named = own.find(claim => claim.module) || own.find(claim => claim.source !== 'vueuse')
  const claimed = named?.module
  const claimedSymbol = named?.symbol
  const claimedSource = named?.source
  const claimConfirmed = !!named && !!named.module
    && moduleExports(named.source, named.module, named.symbol)

  // `upstream || undefined`: an empty module path must read as "no pinned
  // path", not as a path.
  const resolved = (source: string, upstream: string | undefined, symbol: string | undefined): ResolvedExport =>
    ({ source, upstream: upstream || undefined, symbol, claimed, claimConfirmed })

  // 1 — the claim this export's own annotation makes, in its own source.
  if (claimConfirmed)
    return resolved(claimedSource!, claimed, claimedSymbol)

  for (const claim of own) {
    // 2 — the VueUse prose form names a symbol without a package: look for the
    // module defining it in the page's own upstream package, then `shared/utils`
    // (the VueUse pin only — see `RE_PROSE_PORT`).
    if (!claim.module && claim.symbol && claim.source === 'vueuse') {
      const hit = findUpstreamModule(modulesOfPackage(pkg), claim.symbol)
        || findUpstreamModule(['packages/shared/utils'], claim.symbol)
      if (hit)
        return resolved('vueuse', hit, claim.symbol)
    }
    // 2b — a `Map from` claim on a source that named no module path.
    if (!claim.module && claim.symbol && claim.source !== 'vueuse') {
      const hit = findClaimedModule(claim.source, claim.qualifier, claim.symbol)
      if (hit)
        return resolved(claim.source, hit, claim.symbol)
    }
  }
  // 3 — a module the file claims that exports this symbol under another name.
  for (const claim of all) {
    if (claim.module && moduleExports(claim.source, claim.module, name))
      return resolved(claim.source, claim.module, name)
  }
  // 4 — a source the file claims whose pin did not confirm the annotation:
  // search that source's own tree, and stop there. Falling through to the
  // VueUse heuristics below would label a non-VueUse port with a VueUse module.
  for (const source of new Set(all.map(claim => claim.source).filter(id => id !== 'vueuse'))) {
    const hit = findSourceModuleBySymbol(source, name)
    if (hit)
      return resolved(source, hit, name)
  }
  // 5 — the page maps onto an upstream VueUse directory of the same name.
  const page = `packages/${pkg}/${dir}`
  if (findUpstreamModule([page], name))
    return resolved('vueuse', page, name)
  // 6 — another module of the page's own upstream VueUse package.
  const withinPackage = findUpstreamModule(modulesOfPackage(pkg), name)
  if (withinPackage)
    return resolved('vueuse', withinPackage, name)
  // 7 — upstream `shared/utils` (one barrel, no per-symbol directories).
  const shared = findUpstreamModule(['packages/shared/utils'], name)
  if (shared)
    return resolved('vueuse', shared, name)

  // No module in a pinned submodule has this export. Say *why*, so the status
  // column stops calling a Vue API or a post-pin hook "reause-only": a claim the
  // pin cannot confirm (`useWebMCP` postdates it; `useWatch` is Vue's own
  // `watch`), or a symbol VueUse itself imports from `vue` (`toValue`) rather
  // than defines. A non-VueUse claim is *always* reported as an unconfirmed
  // claim, never as `reause-only` (issue #915).
  const missingFrom = named
    ? 'unconfirmed-claim'
    : collectVueApiSymbols().has(name) ? 'vue-api' : 'reause-only'
  return {
    claimed,
    claimConfirmed,
    symbol: claimedSymbol || name,
    source: missingFrom === 'reause-only' ? undefined : claimedSource || 'vueuse',
    missingFrom,
  }
}
function parseExports(file: string): string[] {
  const content = readFileSync(file, 'utf-8')
  const names: string[] = []
  for (const match of content.matchAll(RE_EXPORT)) {
    names.push(match[1] || match[2])
  }
  return names
}

/**
 * Last commit time (ms) of a hook source file, via `git log -1 --format=%at`.
 * Mirrors VueUse's `git.raw(['log', '-1', '--format=%at', tsPath]) * 1000`
 * (metadata/scripts/update.ts). Returns `undefined` when the file is not
 * tracked (or git fails) so callers can fall back gracefully.
 */
function getLastUpdated(file: string): number | undefined {
  try {
    const at = execSync(`git log -1 --format=%at -- "${file}"`, { cwd: root, encoding: 'utf-8' }).trim()
    const seconds = Number(at)
    return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : undefined
  }
  catch {
    return undefined
  }
}

/**
 * Scan every hook package's co-located modules (`packages/<pkg>/<hook>/index.tsx`)
 * and regenerate `meta/functions.md` and `meta/functions.ts` (the structured
 * registry consumed by the docs markdown transformer and the PWA route list),
 * mirroring VueUse's metadata-driven function list.
 */
export async function generateFunctionsMD() {
  const rows = collectFunctionRows().map(({ name, file, source, upstream, symbol, missingFrom }) => {
    // The `source` column names the upstream a row belongs to and is `—` for a
    // pure reause-only export (nothing upstream defines or re-exports it).
    // `upstream function` is the symbol the port's own annotation names — the
    // upstream name for a renamed port (`useRafInterval` ← ahooks, reause
    // `useIntervalRafFn`), otherwise the reause export name.
    //
    // `source path` is the resolved pin-relative module; `—` means no module in
    // a pinned submodule has this export, and the status distinguishes *why*:
    //   - `reause-only export`  — nothing upstream defines or re-exports it;
    //   - `not in pinned submodule` — the port claims an upstream the pin cannot
    //     confirm (`useWebMCP` postdates it, `useWatch` is Vue's `watch`) or the
    //     symbol is one VueUse takes from `vue` (`toValue`).
    // Neither is "no upstream match" for a renamed or secondary export, which is
    // what the removed same-name-directory probe used to report.
    const status = upstream
      ? '✅ ported'
      : missingFrom === 'reause-only' ? '✅ reause-only export' : '✅ ported (not in pinned submodule)'
    return `| ${source || '—'} | \`${symbol || name}\` | ${upstream || '—'} | \`${file}\` | ${status} |`
  })

  const md = `# Function mapping status

> Auto-generated by \`npm run update\` (scripts/update.ts) — do not edit by hand.
> The upstream sources of truth are the pinned \`source/*\` submodules: \`source/vueuse\` for ports that name no other source, and the tree of the source the row's own \`Map from\` annotation names otherwise — react-use, react-hookz, mantine and ahooks each have their own pin. Only \`source/vueuse\` is polled for upstream updates (docs/upstream-monitoring.md §1).
> Export-driven: every row is an export of this repo, so an upstream function with no reause port would simply be absent — this table is a port registry, not a coverage proof (audit procedure: docs/upstream-monitoring.md §3.2).
> Status: \`✅ ported\` = resolved to a module in its source's pin; \`✅ ported (not in pinned submodule)\` = the port's upstream is newer than the pin, or a symbol VueUse re-exports from \`vue\`; \`✅ reause-only export\` = nothing upstream defines or re-exports it.

| source | upstream function | source path (pinned) | reause | status |
|---|---|---|---|---|
${rows.join('\n') || '| — | — | — | — | no hooks mapped yet |'}
`

  writeFileSync(join(root, 'meta/functions.md'), await format(md, { parser: 'markdown' }))
  console.log(`[update] wrote meta/functions.md (${rows.length} functions)`)
}

/**
 * One `meta/functions.md` row / `meta/functions.ts` entry: the reause export,
 * the source file it points at, the upstream source and module it resolves to
 * (`undefined` when the export is genuinely reause-only) and the provenance
 * claim the port itself makes for that export. Exported so the structural guard
 * in `test/functions-table.test.ts` can assert the resolver's output directly,
 * rather than only the committed (and lagging) generated table.
 */
export interface FunctionRow extends ResolvedExport {
  name: string
  /** Hook source the row points at, relative to the repo root. */
  file: string
}

export function collectFunctionRows(): FunctionRow[] {
  // `meta/functions.md` carries no `lastUpdated` column, so skip the per-file
  // `git log` probe — it is the only expensive part of the scan.
  return collectFunctions({ lastUpdated: false })
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(fn => ({
      name: fn.name,
      file: fn.file,
      ...resolveExport(fn.name, fn.pkg, fn.dir, join(root, fn.file)),
    }))
}

function collectFunctions(options: { lastUpdated?: boolean } = {}): MappedFunction[] {
  // hooks live co-located with their docs: packages/<pkg>/<hook>/index.tsx
  // (metadata is not scanned — its files are generated, not hooks)
  const files = globSync('packages/{core,shared,math,integrations,electron,firebase,rxjs}/*/index.tsx', {
    cwd: root,
    absolute: true,
  })

  const functions: MappedFunction[] = []
  const seen = new Set<string>()
  for (const file of files) {
    const rel = file.replace(/\\/g, '/')
    const [, pkg, dir] = rel.match(/packages\/(\w+)\/([^/]+)\/index\.tsx$/) || []
    if (!pkg || !dir)
      continue
    const category = getPageCategory(pkg, dir)
    const lastUpdated = options.lastUpdated === false ? undefined : getLastUpdated(`packages/${pkg}/${dir}/index.tsx`)
    for (const name of parseExports(file)) {
      // TypeScript overload signatures export the same name repeatedly —
      // collapse them into a single registry entry per (name, file).
      const key = `${name}\u0000${pkg}/${dir}`
      if (seen.has(key))
        continue
      seen.add(key)
      functions.push({ name, file: `packages/${pkg}/${dir}/index.tsx`, pkg, dir, category, lastUpdated })
    }
  }
  return functions.sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Collapse the export-level registry onto docs pages — one entry per
 * `packages/<pkg>/<page>/index.md`, named after the page directory exactly
 * like VueUse's directory-driven metadata (`useBreakpoints` covers
 * `breakpointsTailwind` & co.). Consumed by `packages/skills/build.ts`, which
 * mirrors VueUse's `packages/skills/build.ts` one function page per skill
 * reference.
 */
function collectPages(functions: MappedFunction[]): MappedPage[] {
  const byDir = new Map<string, MappedFunction[]>()
  for (const fn of functions) {
    const key = `${fn.pkg}/${fn.dir}`
    const list = byDir.get(key)
    if (list)
      list.push(fn)
    else
      byDir.set(key, [fn])
  }

  const pages: MappedPage[] = []
  for (const entries of byDir.values()) {
    const { pkg, dir, category, lastUpdated } = entries[0]
    const md = readFileSync(join(root, 'packages', pkg, dir, 'index.md'), 'utf-8')
    const alias = readFrontmatterList(md, 'alias')
    const related = readFrontmatterList(md, 'related')
    pages.push({
      name: dir,
      pkg,
      doc: `packages/${pkg}/${dir}/index.md`,
      category,
      description: extractDescription(md),
      // `_`-prefixed directories are shared internals rather than a documented
      // composable — VueUse's `listFunctions` skips them the same way.
      internal: dir.startsWith('_') || undefined,
      lastUpdated: lastUpdated ? Math.max(...entries.map(e => e.lastUpdated || 0)) : undefined,
      // Emitted only where the page declares them, so the committed `pages`
      // array stays byte-identical for the pages that don't.
      alias: alias.length ? alias : undefined,
      related: related.length ? related : undefined,
    })
  }

  return pages.sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Intro sentence of a docs page, used as the skill-table description.
 * Ports VueUse's `readMetadata()` (packages/metadata/scripts/update.ts):
 * drop the frontmatter and `:::` container blocks, take the first paragraph
 * after the `#` heading, then lower-case the leading character unless the
 * description starts with an abbreviation.
 */
function extractDescription(md: string): string {
  const content = md.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '')
  const matched = (
    content
      // normalize newlines
      .replace(/\r\n/g, '\n')
      // remove ::: tip blocks
      .replace(/(:{3,}(?=[^:\n]*\n))[^\n]*\n[\s\S]*?\1 *(?=\n)/g, '')
      // remove headers
      .match(/#(?=\s).*\n+(.+?)(?:, |\. |\n|\.\n)/) || []
  )[1] || ''

  const description = matched.trim()
  if (!/^[A-Z][A-Z]/.test(description))
    return description.charAt(0).toLowerCase() + description.slice(1)
  return description
}

/**
 * Write `packages/metadata/src/functions.ts` — the structured function
 * registry (name/pkg/file/category/source/lastUpdated) consumed by the docs
 * markdown transformer, the PWA route list and the theme's FunctionsList
 * (category filter / search / sort), plus the page-level `pages` view the
 * agent-skill generator consumes. Mirrors VueUse's generated
 * `packages/metadata/metadata.ts`.
 */
async function generateFunctionsTS() {
  // The /functions registry drives sidebar-visible docs pages: keep only
  // functions whose co-located page (index.md) exists, so every entry in
  // the FunctionsList links to a real page (mirrors VueUse's page-driven
  // metadata; the progress table in meta/functions.md keeps all entries).
  const all = collectFunctions().filter((fn) => {
    const [, pkg, dir] = fn.file.match(/^packages\/(\w+)\/([^/]+)\/index\.tsx$/) || []
    if (!pkg || !dir)
      return false
    try {
      readFileSync(join(root, 'packages', pkg, dir, 'index.md'))
      return true
    }
    catch {
      return false
    }
  })

  // The registry carries the same `source` the markdown table's column renders
  // (issue #915), resolved by the one resolver both artifacts already share.
  // `undefined` — a pure reause-only export — is dropped by JSON.stringify, so
  // consumers see `fn.source` only where an upstream source exists. The key
  // order matches the committed registry (`name, file, pkg, dir, category,
  // lastUpdated`) so adding a field does not rewrite every entry.
  const provenance = new Map(
    collectFunctionRows().map(row => [`${row.name}\u0000${row.file}`, row.source]),
  )
  // `alias` / `related` are page-level (frontmatter) and two-way (upstream's
  // "interop related" pass), so they resolve against the finished page list
  // before the rows are built and then attach to every export of that page: the
  // docs info block describes a page, not a symbol. `undefined` is dropped by
  // `JSON.stringify`, so rows whose page declares neither keep their shape.
  const pages = collectPages(all)
  interopRelated(pages, all)
  const relations = new Map(pages.map(page => [`${page.pkg}/${page.name}`, page]))

  const functions = all.map((fn) => {
    const relation = relations.get(`${fn.pkg}/${fn.dir}`)
    return {
      name: fn.name,
      file: fn.file,
      pkg: fn.pkg,
      dir: fn.dir,
      category: fn.category,
      source: provenance.get(`${fn.name}\u0000${fn.file}`),
      lastUpdated: fn.lastUpdated,
      alias: relation?.alias,
      related: relation?.related,
    }
  })

  // Category list in VueUse's canonical order: core categories first,
  // `@`-prefixed addon categories last (mirrors `categoryNames` in
  // vueuse/packages/metadata/metadata.ts).
  const categoryNames = [...new Set(functions.map(fn => fn.category))]
    .sort((a, b) => rankCategory(a) - rankCategory(b) || a.localeCompare(b))

  const ts = `/* eslint-disable style/quotes -- prettier keeps double quotes around descriptions containing an apostrophe */
/**
 * Function registry — auto-generated by \`npm run update\` (scripts/update.ts).
 * Do not edit by hand. Mirrors VueUse's generated
 * \`packages/metadata/metadata.ts\` (react-adapted).
 */
export interface FunctionInfo {
  name: string
  pkg: string
  /** Page directory the export belongs to (\`packages/<pkg>/<dir>\`). */
  dir: string
  file: string
  category: string
  /**
   * Upstream source this export ports from (\`vueuse\`, \`react-use\`,
   * \`react-hookz\`, \`mantine\`, \`ahooks\`), resolved from the port's own
   * annotation against that source's pinned tree. Absent for a pure reause-only
   * export (the table's \`—\`).
   */
  source?: string
  lastUpdated?: number
  /** Alternate export names, from the page frontmatter's alias key (mirrors VueUse). */
  alias?: string[]
  /** Pages this one relates to: the page frontmatter's related key plus the two-way interop pass. */
  related?: string[]
}

/**
 * Page-level registry: one entry per \`packages/<pkg>/<page>/index.md\`, named
 * after the page directory like VueUse's directory-driven metadata. Consumed
 * by \`packages/skills/build.ts\`.
 */
export interface FunctionPageInfo {
  name: string
  pkg: string
  doc: string
  category: string
  description: string
  internal?: boolean
  lastUpdated?: number
  /** Alternate export names, from the page frontmatter's alias key. */
  alias?: string[]
  /** Related pages, from the page frontmatter's related key plus the interop pass. */
  related?: string[]
}

export const functions: FunctionInfo[] = ${JSON.stringify(functions, null, 2)}

export const pages: FunctionPageInfo[] = ${JSON.stringify(pages, null, 2)}

export const categoryNames: string[] = ${JSON.stringify(categoryNames, null, 2)}

export const coreCategoryNames = categoryNames.filter(c => !c.startsWith('@'))

export const addonCategoryNames = categoryNames.filter(c => c.startsWith('@'))
`
  writeFileSync(join(root, 'packages/metadata/src/functions.ts'), await format(ts, { parser: 'typescript', singleQuote: true, semi: false, trailingComma: 'all', printWidth: 120, arrowParens: 'avoid' }))
  console.log(`[update] wrote packages/metadata/src/functions.ts (${functions.length} functions, ${pages.length} pages, ${categoryNames.length} categories)`)
}

// Category order mirrors VueUse's `packages/metadata/metadata.ts`
// `categoriesOrder` (addon categories, prefixed with `@`, sort after core).
const CATEGORY_ORDER = [
  'State',
  'Elements',
  'Browser',
  'Sensors',
  'Network',
  'Animation',
  'Component',
  'Watch',
  'Reactivity',
  'Array',
  'Time',
  'Utilities',
]

// Read the docs-page category from the co-located index.md frontmatter
// (packages/<pkg>/<page>/index.md). Returns 'Uncategorized' when the page
// has none or doesn't exist.
function getPageCategory(pkg: string, page: string): string {
  try {
    return readFileSync(join(root, 'packages', pkg, page, 'index.md'), 'utf-8')
      .split('\n')
      .find(line => line.startsWith('category:'))
      ?.slice('category:'.length)
      .trim()
      .replace(/^['"]|['"]$/g, '') || 'Uncategorized'
  }
  catch {
    return 'Uncategorized'
  }
}

/**
 * A frontmatter list value — `alias: a`, `alias: a, b`, `alias: [a, b]` or a
 * YAML block list. Ports the shape handling of VueUse's `readMetadata()`
 * (metadata/scripts/update.ts), which splits a scalar on commas and trims an
 * array the same way; `gray-matter` is not a dependency here, so the block is
 * read line by line the way `getPageCategory` does.
 */
function readFrontmatterList(md: string, key: string): string[] {
  const lines = md.replace(/\r\n/g, '\n').split('\n')
  if (lines[0]?.trim() !== '---')
    return []
  const end = lines.indexOf('---', 1)
  const block = lines.slice(1, end === -1 ? lines.length : end)
  const start = block.findIndex(line => line.startsWith(`${key}:`))
  if (start === -1)
    return []

  const raw = block[start].slice(key.length + 1).trim()
  const items: string[] = []
  if (raw) {
    // `[a, b]` flow list, or the comma-separated scalar upstream splits.
    items.push(...raw.replace(/^\[|\]$/g, '').split(','))
  }
  else {
    // `key:` with nothing after it introduces a YAML block list underneath;
    // reading stops at the first line that is not one of its items.
    for (const line of block.slice(start + 1)) {
      const item = line.trim()
      if (!item.startsWith('-'))
        break
      items.push(item.slice(1))
    }
  }

  return items
    .map(item => item.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean)
}

/**
 * VueUse's "interop related" pass: `related` is a two-way relation, so a page
 * that names another also becomes related to it. reause resolves an entry to a
 * docs page — the registry is directory-driven, so a name shared by several
 * exports (`breakpointsTailwind`) belongs to the same page as its siblings — and
 * throws on an unknown name exactly like upstream, turning a typo into a failing
 * `npm run update` instead of a silently dead docs link.
 */
function interopRelated(pages: MappedPage[], functions: MappedFunction[]): void {
  function resolve(name: string): MappedPage | undefined {
    const byDir = pages.find(page => page.name === name)
    if (byDir)
      return byDir
    const row = functions.find(fn => fn.name === name)
    return row ? pages.find(page => page.pkg === row.pkg && page.name === row.dir) : undefined
  }

  for (const page of pages) {
    if (!page.related)
      continue
    for (const name of page.related) {
      const target = resolve(name)
      if (!target)
        throw new Error(`Unknown related function: ${name}`)
      if (!target.related)
        target.related = []
      if (!target.related.includes(page.name))
        target.related.push(page.name)
    }
  }

  pages.forEach(page => page.related?.sort())
}

// VueUse's canonical category order: known core categories by rank, unknown
// categories after, `@`-prefixed addon categories last.
function rankCategory(c: string): number {
  const i = CATEGORY_ORDER.indexOf(c)
  if (i !== -1)
    return i
  return c.startsWith('@') ? CATEGORY_ORDER.length : CATEGORY_ORDER.length + 1
}

/**
 * Regenerate `packages/functions.md` — the /functions/ docs page.
 * Mirrors VueUse's auto-generated `packages/functions.md`: a thin page that
 * renders the theme's `<FunctionsList />` component (category filter, search
 * and sort driven by `#category=` / `#search=` / `#sort=` hash params, e.g.
 * `/functions#category=State` from the sidebar/nav category links).
 */
async function generateFunctionsPage() {
  const md = `# Functions

<FunctionsList />
`
  writeFileSync(join(root, 'packages/functions.md'), await format(md, { parser: 'markdown' }))
  console.log('[update] wrote packages/functions.md (<FunctionsList />)')
}

async function main() {
  await generateFunctionsMD()
  await generateFunctionsTS()
  await generateFunctionsPage()
}

// Only regenerate when run as the CLI (`npm run update`) — importing this
// module (e.g. from the structural guard in `test/`) must stay side-effect free.
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]))
  main()
