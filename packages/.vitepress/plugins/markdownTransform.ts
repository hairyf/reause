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
      // HTML, and skipping tokens already inside a markdown link label.
      const linked = lines.map((line) => {
        const trimmed = line.trimStart()
        if (trimmed.startsWith('```') || trimmed.startsWith('<'))
          return line
        return line.replace(/`([\w-]+)`/g, (raw, name) => {
          if (line.includes(`[\`${name}\`]`))
            return raw
          const link = registered.get(name)
          return link ? `[\`${name}\`](${link})` : raw
        })
      }).join('\n')

      if (!page)
        return linked

      const [, pkg, dir] = page

      // --- Header: demo on top, right after the description/notes -----------
      let out = linked
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
      footer.push(`<Contributors name="${dir}" />`)
      return `${out.trimEnd()}\n\n${footer.join('\n')}\n`
    },
  }
}
