import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import { transformerTwoslash } from '@shikijs/vitepress-twoslash'
import { createFileSystemTypesCache } from '@shikijs/vitepress-twoslash/cache-fs'
import { createHighlighter } from 'shiki'
import { globSync } from 'tinyglobby'
import ts from 'typescript'
import { MarkdownTransform } from '../packages/.vitepress/plugins/markdownTransform'
import { TWOSLASH_CACHE_DIR, TWOSLASH_PATHS } from '../packages/.vitepress/twoslash'
import { functions } from '../packages/metadata/src/functions'
import { root } from './utils'

/**
 * Pre-populate the twoslash types cache before the VitePress build.
 *
 * `@shikijs/vitepress-twoslash` type-checks every `ts`/`tsx` block with
 * TypeScript, and the result is cached per block by
 * `createFileSystemTypesCache` (`@shikijs/vitepress-twoslash/dist/index.mjs`:
 * a cache hit returns before any TS program is built). That cache directory is
 * gitignored, so a CI build always starts cold and pays full price for all
 * ~960 blocks — which is what makes the docs build exceed Netlify's 8 GiB
 * (upstream tracks this as shikijs/shiki#796, and closed the VitePress-side
 * vuejs/vitepress#4242 as not planned).
 *
 * Warming it in a **separate process** splits the work: this pass builds the
 * types once and exits, then `vitepress build` runs against a warm cache.
 * Measured on 300 real blocks, the same rendering costs 983 MB / 20 s cold
 * against 362 MB / 4 s warm, for byte-identical output — each process then fits
 * comfortably in the 8 GiB budget instead of one process needing more.
 *
 * The blocks are taken from the same `MarkdownTransform` the build uses, so the
 * injected import preamble (and therefore the cache key, which is a hash of the
 * block's code) matches exactly.
 */
const FENCE_RE = /```(ts|tsx|typescript)([^\n]*)\n([\s\S]*?)\n```/g

/** Pages VitePress renders: `srcDir` is `packages`, minus `srcExclude`. */
const pages = globSync('**/*.md', {
  cwd: join(root, 'packages'),
  ignore: ['skills/**', '.vitepress/**', '**/node_modules/**'],
})

const plugin = MarkdownTransform(functions) as {
  transform: (code: string, id: string) => unknown
}

interface Block {
  lang: string
  meta: string
  code: string
}

const blocks: Block[] = []
for (const page of pages) {
  const file = join(root, 'packages', page)
  const transformed = await plugin.transform(readFileSync(file, 'utf-8'), file)
  if (typeof transformed !== 'string')
    continue
  for (const match of transformed.matchAll(FENCE_RE)) {
    if (!match[2].includes('twoslash'))
      continue
    blocks.push({ lang: match[1], meta: match[2].trim(), code: match[3] })
  }
}

const typesCache = createFileSystemTypesCache({
  dir: join(root, 'packages/.vitepress', TWOSLASH_CACHE_DIR),
})
typesCache.init?.()

const pending = blocks.filter(block => !typesCache.read(block.code))
const hits = blocks.length - pending.length
console.log(`twoslash cache: ${hits}/${blocks.length} blocks already cached, warming ${pending.length}`)

if (pending.length) {
  const highlighter = await createHighlighter({
    // The theme only affects the (discarded) HTML, never the cached types.
    themes: ['github-light'],
    langs: ['ts', 'tsx', 'typescript', 'js', 'jsx', 'html', 'css', 'json', 'bash', 'vue'],
  })

  const transformer = transformerTwoslash({
    twoslashOptions: {
      // Must match `packages/.vitepress/config.ts`: the cache key is the code
      // alone, so a different compiler setup would silently poison it.
      compilerOptions: {
        jsx: ts.JsxEmit.ReactJSX,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        baseUrl: root,
        paths: TWOSLASH_PATHS,
      },
      handbookOptions: { noErrors: true },
    },
    typesCache,
  })

  async function render(block: Block): Promise<string> {
    const options = {
      lang: block.lang,
      meta: { __raw: block.meta },
      theme: 'github-light',
      transformers: [transformer],
    }
    try {
      return highlighter.codeToHtml(block.code, options)
    }
    catch (error) {
      // Hover cards are rendered *through* shiki, and third-party JSDoc ships
      // fences in languages VitePress preloads but this bare highlighter does
      // not (firebase's `@firebase/firestore` uses ```javascript). Load the
      // missing language and retry rather than guessing the full set.
      const missing = /Language `([^`]+)` not found/.exec(String(error))
      if (!missing)
        throw error
      await highlighter.loadLanguage(missing[1] as never)
      return highlighter.codeToHtml(block.code, options)
    }
  }

  const started = Date.now()
  for (const [index, block] of pending.entries()) {
    // Renders to HTML that is thrown away; the side effect is the cache write.
    await render(block)
    if ((index + 1) % 200 === 0) {
      const { rss } = process.memoryUsage()
      console.log(`  ${index + 1}/${pending.length} blocks (${Math.round(rss / 1024 / 1024)}MB rss, ${((Date.now() - started) / 1000).toFixed(0)}s)`)
    }
  }
  console.log(`twoslash cache warmed in ${((Date.now() - started) / 1000).toFixed(0)}s`)
}
