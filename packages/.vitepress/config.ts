import type { HeadConfig, TransformContext } from 'vitepress'
import type { FunctionPageInfo } from '../../packages/metadata/src/functions'
import type { ContributorInfo } from './plugins/contributors'
import { execSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { transformerTwoslash } from '@shikijs/vitepress-twoslash'
import { createFileSystemTypesCache } from '@shikijs/vitepress-twoslash/cache-fs'
import { withPwa } from '@vite-pwa/vitepress'
import ts from 'typescript'
import UnoCSSPostCSS from 'unocss/postcss'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitepress'
import { currentVersion, versions } from '../../meta/versions'
import { categoryNames, functions, pages } from '../../packages/metadata/src/functions'
import { ChangeLog, getChangeLog } from './plugins/changelog'
import { Contributors } from './plugins/contributors'
import { MarkdownTransform } from './plugins/markdownTransform'
import { PWAVirtualModule } from './plugins/pwa-virtual'
import { FILE_IMPORTS, stripPopupImages } from './twoslash'

/**
 * VitePress config for the reause docs site (docs root = `packages/`,
 * mirroring VueUse's `packages/.vitepress/config.ts`).
 */

// Per-page contributors, derived from git history of the page's source file
// (mirrors VueUse, which derives them from the function directory history).
//
// Keyed by page directory, not by export name: `Contributors.vue` receives the
// page dir (`<Contributors name="${dir}" />`), and a page such as
// `electron/_resolve` has no export sharing its name — keying by `fn.name` left
// that page looking up a key nobody ever wrote. Several exports can share one
// page dir (and therefore one source file), so each file is walked only once.
function getFunctionContributors(): Record<string, ContributorInfo[]> {
  const result: Record<string, ContributorInfo[]> = {}
  for (const fn of functions) {
    if (result[fn.dir] !== undefined)
      continue
    try {
      const raw = execSync(`git log --pretty=format:%an%x09%ae --follow -- "${fn.file}"`, { encoding: 'utf-8' })
      const byEmail = new Map<string, { name: string, email: string, commits: number }>()
      for (const line of raw.split('\n').filter(Boolean)) {
        const [name, email] = line.split('\t')
        const key = (email || name).toLowerCase()
        const entry = byEmail.get(key)
        if (entry) {
          entry.commits += 1
        }
        else {
          byEmail.set(key, { name, email, commits: 1 })
        }
      }
      result[fn.dir] = [...byEmail.values()].map(a => ({
        name: a.name,
        avatar: `https://www.gravatar.com/avatar/${createHash('md5').update(a.email.trim().toLowerCase()).digest('hex')}?d=retro`,
        login: a.name.replace(/\s+/g, ''),
        url: '',
        commits: a.commits,
      }))
    }
    catch {
      result[fn.dir] = []
    }
  }
  return result
}

// Sidebar groups, mirroring VueUse's `getFunctionsSideBar()`: the groups are
// derived from the generated function metadata (`packages/metadata/src`), not
// from a filesystem scan, so every documented package is covered no matter
// which package directory it lives in. Categories keep VueUse's canonical
// order (addon categories last).
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

// Position in `CATEGORY_ORDER`, with unknown (e.g. `Lifecycle`) and `@`-prefixed
// addon categories sorted after the ordered core ones.
function categoryIndex(category: string) {
  const index = CATEGORY_ORDER.indexOf(category)
  return index === -1 ? Number.POSITIVE_INFINITY : index
}

function getFunctionsSideBar() {
  const groups = new Map<string, FunctionPageInfo[]>()
  // `internal: true` entries (e.g. the `_resolve` helper page) are deliberately
  // absent from the public navigation — mirrors VueUse's `!i.internal` filter.
  for (const page of pages) {
    if (page.internal)
      continue
    const list = groups.get(page.category) ?? []
    list.push(page)
    groups.set(page.category, list)
  }
  return [...groups.entries()]
    .sort(([a], [b]) => categoryIndex(a) - categoryIndex(b) || a.localeCompare(b))
    .map(([category, fns]) => ({
      // Addon categories carry a leading `@` in the metadata (mirroring
      // VueUse's addon naming); strip it for display, like VueUse's nav.
      text: category.startsWith('@') ? category.slice(1) : category,
      items: fns
        .sort((x, y) => x.name.localeCompare(y.name) || x.pkg.localeCompare(y.pkg))
        .map(fn => ({ text: fn.name, link: `/${fn.pkg}/${fn.name}/` })),
    }))
}

// Guide pages (mirrors VueUse's Guide links, adapted to reause's pages).
const Guide = [
  { text: 'Get Started', link: '/guide/' },
  { text: 'Best Practice', link: '/guide/best-practice' },
  { text: 'Configurations', link: '/guide/config' },
  { text: 'Components', link: '/guide/components' },
  { text: 'Work with AI', link: '/guide/work-with-ai' },
  { text: 'Contributing', link: '/contributing' },
  { text: 'Guidelines', link: '/guidelines' },
]

// Utility links (mirrors VueUse's Links list, adapted to reause).
const Links = [
  { text: 'Export Size', link: '/export-size' },
  { text: 'Recent Updated', link: '/functions.html#sort=updated' },
]

// Function categories present in the docs, in VueUse's canonical order
// (core categories first, `@`-prefixed addon categories last).
function getCategoryNames() {
  const core: string[] = []
  const addons: string[] = []
  const documented = new Set(pages.filter(page => !page.internal).map(page => page.category))
  for (const category of categoryNames) {
    if (category.startsWith('_') || !documented.has(category))
      continue
    const target = category.startsWith('@') ? addons : core
    target.push(category)
  }
  core.sort((a, b) => categoryIndex(a) - categoryIndex(b) || a.localeCompare(b))
  addons.sort()
  return { core, addons }
}

const { core: coreCategoryNames, addons: addonCategoryNames } = getCategoryNames()

// Category anchors on /functions (e.g. /functions#category=State), mirroring
// VueUse's CoreCategories / AddonCategories nav + sidebar entries.
const CoreCategories = coreCategoryNames.map(c => ({
  text: c,
  activeMatch: '___', // never active — these are anchors on /functions
  link: `/functions#category=${c}`,
}))

const AddonCategories = addonCategoryNames.map(c => ({
  text: c.slice(1),
  activeMatch: '___',
  link: `/functions#category=${encodeURIComponent(c)}`,
}))

// The default sidebar shown on guide pages, mirroring VueUse's DefaultSideBar.
const DefaultSideBar = [
  { text: 'Guide', items: Guide },
  { text: 'Core Functions', items: CoreCategories },
  { text: 'Add-ons', items: AddonCategories },
  { text: 'Links', items: Links },
]

// Routes to precache in the service worker (virtual:pwa), mirroring
// VueUse's packageNames entries. Links use the docs page dir derived from
// the registry file (several hooks export multiple names from one page).
const packageNames: [string, { url: string, hash: string }][] = [
  ['/', { url: '/index.html', hash: '' }],
  ['/functions', { url: '/functions.html', hash: '' }],
  ...[...new Map(functions.map((fn) => {
    const dir = fn.file.replace(/^packages\/\w+\/([^/]+)\/index\.tsx$/, '$1')
    const url = `/${fn.pkg}/${dir}/`
    return [url, { url, hash: '' }] as const
  })).entries()],
]

// Per-page head additions (og meta), mirroring VueUse's transformHead.ts.
function transformHead(context: TransformContext): HeadConfig[] {
  const title = context.pageData.title ? `${context.pageData.title} | ReaUse` : 'ReaUse'
  return [
    ['meta', { property: 'og:title', content: title }],
    ['meta', { property: 'og:image', content: '/reause.svg' }],
    ['meta', { name: 'twitter:card', content: 'summary' }],
  ]
}

const FunctionsSideBar = getFunctionsSideBar()

export default withPwa(defineConfig({
  lang: 'en-US',
  title: 'ReaUse',
  description: 'Reactive utilities for React — an experimental 1:1 AI-mapped port of VueUse',
  lastUpdated: true,
  // `packages/skills` is build tooling for the generated agent skill, not a
  // docs package: its README/templates must not become docs pages, and the
  // git-ignored `packages/skills/skills` output present in a dev tree would
  // otherwise add ~250 reference pages (precached by the PWA, and their
  // relative links would fail the dead-link check).
  srcExclude: ['skills/**'],
  head: [
    ['link', { rel: 'icon', href: '/reause.svg', type: 'image/svg+xml' }],
    ['meta', { property: 'og:description', content: 'Reactive utilities for React — an experimental 1:1 AI-mapped port of VueUse' }],
  ],
  transformHead,
  // Twoslash: code blocks are type-checked at build time, so readers get hover
  // cards (types, signatures, JSDoc) on the docs site — mirrors VueUse's
  // `markdown.codeTransformers` wiring, with the React-specific bits below.
  //
  // Only blocks whose meta carries `twoslash` are processed — this transformer
  // defaults to `explicitTrigger: true`. `MarkdownTransform` deliberately does
  // NOT add that meta for every ts/tsx block the way VueUse does: upstream only
  // injects `vue`, while reause injects the whole function registry, and
  // defaulting every snippet on exhausted the heap on Netlify. A block opts in
  // by writing `twoslash` in its fence meta, and then gets `// @include:
  // imports` prepended. See `resolveTwoslashMeta` for the full rationale.
  markdown: {
    // Shiki resolves languages lazily, but hover cards are rendered *through*
    // shiki while the markdown is transformed, and a popup fence in an
    // unloaded language is a hard error. Third-party typings ship such fences
    // (firebase's `@firebase/firestore` JSDoc uses ```javascript), so the
    // languages our snippets reach through imports are preloaded here.
    codeTransformers: [
      transformerTwoslash({
        twoslashOptions: {
          compilerOptions: {
            // Match tsconfig.json: snippets are .tsx with the automatic JSX
            // runtime (`jsx: react-jsx`), and `@reause/*` resolves through the
            // workspace package manifests, i.e. Bundler resolution.
            jsx: ts.JsxEmit.ReactJSX,
            moduleResolution: ts.ModuleResolutionKind.Bundler,
          },
          handbookOptions: {
            // Docs snippets are intentionally partial (continuation examples,
            // globals that only exist in a component, unresolved env vars), so
            // compiler diagnostics are not rendered as errors.
            noErrors: true,
          },
        },
        includesMap: new Map([['imports', `// ---cut-start---\n${FILE_IMPORTS}\n// ---cut-end---`]]),
        typesCache: createFileSystemTypesCache({
          dir: resolve(__dirname, 'cache', 'twoslash'),
        }),
      }),
      // Hover cards render third-party JSDoc, which references images by
      // relative path (rxjs: `![](interval.png)`) — those would be resolved as
      // page assets and break the production build.
      stripPopupImages,
    ],
  },
  // Note: no @vitejs/plugin-react here — Vite's built-in esbuild transforms
  // .tsx with the automatic JSX runtime. React demos are mounted client-side
  // by the theme's DemoContainer component.
  vite: {
    // Package exports point at dist (like upstream VueUse), so the docs and the
    // co-located demos resolve the workspace packages from source — mirrors
    // VueUse's packages/.vitepress/vite.config.ts aliases.
    resolve: {
      alias: {
        '@reause/shared': resolve(__dirname, '../shared/index.ts'),
        '@reause/core': resolve(__dirname, '../core/index.ts'),
        '@reause/math': resolve(__dirname, '../math/index.ts'),
        '@reause/integrations': resolve(__dirname, '../integrations/index.ts'),
        '@reause/electron': resolve(__dirname, '../electron/index.ts'),
        '@reause/firebase': resolve(__dirname, '../firebase/index.ts'),
        '@reause/rxjs': resolve(__dirname, '../rxjs/index.ts'),
        '@reause/metadata': resolve(__dirname, '../metadata/src/index.ts'),
      },
    },
    // Cast: vitepress bundles its own vite copy, so its PluginOption type
    // differs structurally from the root vite types our plugins import.
    plugins: [
      ChangeLog(getChangeLog()),
      Contributors(getFunctionContributors()),
      PWAVirtualModule(packageNames),
      MarkdownTransform(functions),
      VitePWA({
        registerType: 'autoUpdate',
        strategies: 'injectManifest',
        srcDir: '.vitepress',
        filename: 'sw.ts',
        injectManifest: {
          // Explicit esnext target: the inherited mixed build target makes
          // esbuild try to lower destructuring in workbox v7's sw bundle,
          // which it refuses to do ("Transform failed ... not supported yet").
          target: 'esnext',
          // The sw build runs its own bundling step; `virtual:pwa` must be
          // resolved there, so the module plugin is wired into this build too.
          plugins: [PWAVirtualModule(packageNames)],
          globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
          maximumFileSizeToCacheInBytes: 10_000_000,
        },
        manifest: {
          name: 'ReaUse',
          short_name: 'ReaUse',
          description: 'Reactive utilities for React — an experimental 1:1 AI-mapped port of VueUse',
          theme_color: '#3b82f6',
          icons: [
            { src: '/reause.svg', sizes: 'any', type: 'image/svg+xml' },
          ],
        },
      }),
    ] as any,
    // UnoCSS via its PostCSS plugin (the unocss vite plugin is a no-op under
    // this repo's vite 8.2.2): the `@unocss default;` directive in
    // theme/styles/demo.css expands the utility classes used by the demos.
    css: {
      postcss: {
        plugins: [UnoCSSPostCSS()],
      },
    },
  },
  themeConfig: {
    logo: '/reause.svg',
    nav: [
      {
        text: 'Guide',
        items: [
          { text: 'Guide', items: Guide },
          { text: 'Links', items: Links },
        ],
      },
      {
        text: 'Functions',
        items: [
          {
            text: '',
            items: [
              { text: 'All Functions', link: '/functions#' },
              { text: 'Recent Updated', link: '/functions#sort=updated' },
            ],
          },
          { text: 'Core', items: CoreCategories },
          { text: 'Add-ons', items: AddonCategories },
        ],
      },
      { text: 'Architecture', link: '/guide/architecture' },
      {
        text: currentVersion,
        items: [
          {
            items: [
              { text: 'Release Notes', link: 'https://github.com/hairyf/reause/releases' },
            ],
          },
          {
            text: 'Versions',
            items: versions.map(i => i.version === currentVersion
              ? {
                  text: `${i.version} (Current)`,
                  activeMatch: '/', // always active
                  link: '/',
                }
              : {
                  text: i.version,
                  link: i.link!,
                }),
          },
        ],
      },
    ],
    sidebar: {
      '/guide/': DefaultSideBar,
      '/contributing': DefaultSideBar,
      '/guidelines': DefaultSideBar,
      '/export-size': DefaultSideBar,
      '/functions': FunctionsSideBar,
      '/core/': FunctionsSideBar,
      '/shared/': FunctionsSideBar,
      '/math/': FunctionsSideBar,
      '/integrations/': FunctionsSideBar,
      '/electron/': FunctionsSideBar,
      '/firebase/': FunctionsSideBar,
      '/rxjs/': FunctionsSideBar,
    },
    footer: {
      message: `Released under the MIT License. ${currentVersion}`,
    },
  },
}))
