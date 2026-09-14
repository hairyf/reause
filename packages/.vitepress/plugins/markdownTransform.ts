import type { Plugin } from 'vite'
import { existsSync } from 'node:fs'
import { upstreamPaths, upstreamSources } from '../../metadata/src/upstream'
import { findSourceFile, getTypeDefinitions, resetTypeCache } from './type-definitions'

/**
 * Inline-markdown transformer for VitePress pages.
 *
 * React adaptation of VueUse's `packages/.vitepress/plugins/markdownTransform.ts`:
 * - backticked function names (`` `useToggle` ``) that match the registry are
 *   auto-linked to their docs page (`[\`useToggle\`](/core/useToggle)`);
 * - every function page gets VueUse's `<FunctionInfo>` block right after its H1
 *   (Category / Export Size / Package / Last Changed / Alias / Related), read
 *   from the generated registry and `packages/export-size.json`;
 * - `ts`/`tsx` blocks that opt in with a `twoslash` fence meta are type-checked
 *   at build time with the reause imports injected, so the docs site shows type
 *   hovers (opt-in rather than VueUse's default-on — see `resolveTwoslashMeta`);
 * - function pages get VueUse's auto-generated chrome injected at build time,
 *   so `index.md` files stay minimal and uniform: a `## Demo` block right
 *   after the description (demo on top), and a footer with `## Type
 *   Declarations` (extracted from the hook's source module), `## Source`
 *   links and the `Contributors` component.
 *
 * Everything a hook page once declared by hand — `**Mapping:**` notes, copied
 * type blocks, source-link sections — is either dropped from the markdown or
 * derived automatically here, mirroring how VueUse's pages are generated.
 */

export interface FunctionRef {
  name: string
  pkg: string
  /** Page directory from the registry (`packages/<pkg>/<dir>/`). */
  dir?: string
  /** Upstream source id from the registry (`vueuse`, `react-use`, …). */
  source?: string
  /** Source file from the registry (`packages/<pkg>/<dir>/index.tsx`). */
  file?: string
}

const REPO = 'https://github.com/hairyf/reause'

/** Map a docs-page id (`.../packages/<pkg>/<Fn>/index.md`) to its parts. */
const PAGE_RE = /packages\/(core|shared|math|integrations|electron|firebase|rxjs)\/([^/]+)\/index\.md$/

/** Page id (`<pkg>/<dir>`) of a registry row, as `upstreamPaths` keys it. */
function pageOf(fn: FunctionRef): string {
  if (fn.dir)
    return `${fn.pkg}/${fn.dir}`
  return (fn.file ?? `packages/${fn.pkg}/${fn.name}/index.tsx`)
    .replace(/^packages\//, '')
    .replace(/\/index\.tsx?$/, '')
}

/** Wrap a long code block in a collapsible <details> (mirrors VueUse). */
function collapsible(code: string): string {
  if (code.length <= 1000)
    return `\`\`\`ts\n${code}\n\`\`\``
  return `<details>\n<summary>Toggle</summary>\n\n\`\`\`ts\n${code}\n\`\`\`\n\n</details>`
}

/**
 * Fenced blocks the twoslash pass can act on. Mirrors VueUse's set (its
 * `ts`/`typescript` handling): `tsx` is reause's example language, and `js`/`jsx`
 * deliberately stay out — twoslash compiles a `js` block as plain JS, so a
 * stray JSX fence there would fail the docs build instead of merely rendering
 * badly. This is the set of *eligible* fences: a block in it is only actually
 * type-checked when its own meta asks for `twoslash` (see `resolveTwoslashMeta`).
 */
const TWOSLASH_LANGS = 'typescript|tsx|ts'
const TS_CODE_BLOCK_RE = new RegExp(`(^|\\n)\`\`\`(${TWOSLASH_LANGS})([^\\n]*)\\n([\\s\\S]*?)\\n\`\`\`(?=\\n|$)`, 'g')

/**
 * Resolve a fence meta into the meta the fence is rendered with.
 *
 * Deliberate deviation from VueUse's `replaceToDefaultTwoslashMeta`, which
 * switches twoslash on for every `ts`/`vue` block that does not opt out. That is
 * affordable upstream because `packages/.vitepress/twoslash.ts` there injects
 * only `vue`; reause injects the whole function registry — every hook of all
 * seven `@reause/*` packages, i.e. the entire monorepo plus its third-party
 * typings (firebase, rxjs, axios, electron, …) — into every snippet. Deep paths
 * are no escape hatch either: each package bundles to a single `dist/index.d.ts`
 * (so `@reause/core/useMouse` does not resolve) and a barrel import always drags
 * the package's whole type graph in. Defaulting the ~690 docs snippets on made
 * the docs build exhaust the heap on Netlify even at
 * `--max-old-space-size=8192`, so twoslash is opt-in: a block is type-checked
 * only when its own meta carries `twoslash`.
 *
 * `no-twoslash` is stripped, so a meta carrying it can never be read as an
 * opt-in.
 */
function resolveTwoslashMeta(meta: string) {
  const trimmed = meta.trim()
  if (!/no-twoslash/i.test(trimmed))
    return trimmed
  return trimmed.replace(/no-twoslash/i, '').trim()
}

/** Whether a resolved meta asks the twoslash transformer to run. */
function isMetaTwoslash(meta: string) {
  return meta.includes('twoslash')
}

/**
 * Type-check the `ts`/`tsx`/`typescript` blocks on a page that opt in to
 * twoslash (VueUse's `// @include: imports` pass, applied to the whole page
 * instead of only the function-page branch):
 *
 * - a block is type-checked only when its own fence meta carries `twoslash`;
 *   `no-twoslash` always opts out, since it is stripped before the meta is read
 *   (see `resolveTwoslashMeta` for why this is opt-in, not upstream's default);
 * - twoslash-checked blocks get `// @include: imports` prepended, which expands
 *   to the `@reause/*` hook imports (see `packages/.vitepress/twoslash.ts`)
 *   inside a `// ---cut-*---` region, i.e. the injected lines are never
 *   rendered. That is what lets a continuation snippet like
 *   `const { x, y } = useMouse()` hover as the real signature instead of `any`.
 *
 * Runs last, so the auto-generated `## Type Declarations` block is covered too
 * (hovering a type there prints its definition, as on the VueUse site).
 */
function withTwoslash(markdown: string): string {
  return markdown.replace(
    TS_CODE_BLOCK_RE,
    (raw, lead: string, lang: string, meta: string, snippet: string) => {
      const resolved = resolveTwoslashMeta(meta)
      const body = isMetaTwoslash(resolved)
        ? `// @include: imports\n${snippet}`
        : snippet
      const fenceMeta = resolved ? ` ${resolved}` : ''
      return `${lead}\`\`\`${lang}${fenceMeta}\n${body}\n\`\`\``
    },
  )
}

/**
 * Build the `## Source` link row for a function page:
 * reause source file · co-located demo · upstream module.
 *
 * The upstream link is composed from two data sources rather than a hard-coded
 * repository: the *source id* comes from the provenance registry (whose
 * `source` column `scripts/update.ts` resolves), and the pin-relative *path*
 * from `upstreamPaths`. The label and repository therefore follow whatever
 * source the registry records, so a react-use, ahooks, mantine or react-hookz
 * page links its own upstream instead of emitting nothing — and never a
 * mislabelled VueUse link.
 */
function sourceLinks(pkg: string, dir: string, source?: string): string {
  // hooks live co-located with their docs: packages/<pkg>/<dir>/index.tsx
  const rel = `packages/${pkg}/${dir}/index`
  const src = (['.tsx', '.ts'] as const).map(ext => `${rel}${ext}`).find(p => existsSync(p))
  const demo = `packages/${pkg}/${dir}/demo.tsx`
  const path = upstreamPaths[`${pkg}/${dir}`]
  const upstream = source ? upstreamSources[source] : undefined

  const links = []
  if (src)
    links.push(`[Source](${REPO}/blob/main/${src})`)
  if (existsSync(demo))
    links.push(`[Demo](${REPO}/blob/main/${demo})`)
  // A source with a pin links the module it pins; a source entry that carries
  // no branch has no checkout to point into, so its link stops at the
  // repository root rather than inventing a path that cannot be verified. A pin
  // whose module the resolver could not locate stays linkless.
  if (upstream) {
    const url = upstream.branch
      ? (path && `${upstream.repo}/blob/${upstream.branch}/${path}`)
      : upstream.repo
    if (url)
      links.push(`[${upstream.label}](${url})`)
  }
  return links.join(' · ')
}

export function MarkdownTransform(functions: FunctionRef[]): Plugin {
  const registered = new Map(functions.map(fn => [fn.name, `/${pageOf(fn)}/`]))
  // Upstream source id per docs page, straight from the registry's `source`
  // column (the provenance of record); a reause-only page has none and so gets
  // no upstream link.
  const sourceOfPage = new Map<string, string>()
  for (const fn of functions) {
    if (fn.source && !sourceOfPage.has(pageOf(fn)))
      sourceOfPage.set(pageOf(fn), fn.source)
  }

  return {
    name: 'reause-markdown-transform',
    enforce: 'pre',
    transform(code, id) {
      if (!id.endsWith('.md'))
        return

      const page = id.replace(/\\/g, '/').match(PAGE_RE)
      const lines = code.split('\n')

      // Linkify backticked function names — outside fenced code blocks and raw
      // HTML, and skipping tokens already inside a markdown link label. The
      // fence state is tracked, not just the fence lines: a template literal
      // such as `` `useToggle` `` inside a snippet must stay code, otherwise the
      // injected link would be compiled by twoslash as TypeScript.
      let inFence = false
      const linked = lines.map((line) => {
        const trimmed = line.trimStart()
        if (trimmed.startsWith('```')) {
          inFence = !inFence
          return line
        }
        if (inFence || trimmed.startsWith('<'))
          return line
        return line.replace(/`([\w-]+)`/g, (raw, name) => {
          if (line.includes(`[\`${name}\`]`))
            return raw
          const link = registered.get(name)
          return link ? `[\`${name}\`](${link})` : raw
        })
      }).join('\n')

      if (!page)
        return withTwoslash(linked)

      const [, pkg, dir] = page

      // --- Header: the VueUse info block, right after the H1 ----------------
      // Category / Export Size / Package / Last Changed / Alias / Related, all
      // read from the generated registry by the component, which upstream
      // injects at this same spot. Anchored on the page's H1, which
      // docs/writing-docs.md requires on every hook page, so a `#` inside a code
      // block can never win the match.
      const info = `<FunctionInfo pkg="${pkg}" dir="${dir}" />`
      let out = linked.replace(/^# .+$/m, match => `${match}\n\n${info}`)

      // --- Header: demo on top, right after the description/notes -----------
      const hasDemo = existsSync(`packages/${pkg}/${dir}/demo.tsx`)
      if (hasDemo) {
        const header = `\n## Demo\n\n<DemoContainer name="${dir}" />\n\n`
        const sliceIndex = out.search(/^#{2,6} /m)
        out = sliceIndex === -1
          ? `${out.trimEnd()}\n${header}`
          : `${out.slice(0, sliceIndex)}${header}${out.slice(sliceIndex)}`
      }

      // --- Footer: Type Declarations + Source + Contributors ----------------
      const footer: string[] = []
      const srcFile = findSourceFile(pkg, dir)
      // The extractor's module-level cycle guards must not leak between
      // transform passes (client build vs SSR render): reset them first so
      // every page gets its full type block.
      resetTypeCache()
      const types = srcFile ? getTypeDefinitions(srcFile) : ''
      if (types)
        footer.push('## Type Declarations', '', collapsible(types), '')
      const links = sourceLinks(pkg, dir, sourceOfPage.get(`${pkg}/${dir}`))
      if (links)
        footer.push('## Source', '', links, '')
      // VueUse emits a `## Contributors` section around the component, so the
      // avatars sit under a heading and the section shows up in the page
      // outline. Emitted unconditionally to mirror upstream; the component
      // itself renders nothing when a page has no recorded contributors.
      footer.push('## Contributors', '', `<Contributors name="${dir}" />`)
      // VueUse's page footer ends with the changelog timeline, fed by the
      // `/virtual-changelog` module (`plugins/changelog.ts`). Emitted
      // unconditionally like upstream: the component renders
      // "No recent changes" when the page has no recorded commits.
      footer.push('## Changelog', '', `<Changelog dir="${dir}" />`)
      return withTwoslash(`${out.trimEnd()}\n\n${footer.join('\n')}\n`)
    },
  }
}
