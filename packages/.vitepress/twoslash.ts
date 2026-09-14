import type { ShikiTransformer } from 'shiki'

/**
 * Twoslash support data for the docs site.
 *
 * React adaptation of VueUse's `packages/.vitepress/twoslash.ts`. VueUse builds
 * the injected imports by introspecting the `vue` runtime module
 * (`getModuleExports(vue)`) and injects that one static list into every block.
 * reause has no single runtime module to introspect — its hooks are spread over
 * seven packages — so the preamble is assembled per block instead, from the
 * generated function registry plus `TWOSLASH_PATHS` below; see `twoslashImports`
 * in `plugins/markdownTransform.ts`.
 *
 * That preamble is what makes *partial* snippets hoverable. Most reause examples
 * are continuation snippets that rely on the surrounding page for context:
 *
 * ```tsx
 * const { x, y } = useMouse({ touch: false })
 * ```
 *
 * Twoslash compiles every code block as its own file, so without an injection
 * that `useMouse` is an unresolved identifier and hovering it would show `any`
 * instead of `function useMouse(options?: UseMouseOptions): UseMouseReturn`.
 */

/** `import { a, b } from 'mod'` + `import type { T } from 'mod'` (mirrors VueUse). */
export function generateFileImports(moduleName: string, exports: string[] = [], exportTypes: string[] = []) {
  const output: string[] = []

  if (exports.length > 0)
    output.push(`import { ${exports.join(', ')} } from '${moduleName}';`)

  if (exportTypes.length > 0)
    output.push(`import type { ${exportTypes.join(', ')} } from '${moduleName}';`)

  return output.join('\n')
}

/**
 * React hooks and types that snippets commonly use without importing them
 * (continuation snippets and JSX examples). React's own runtime types are pulled
 * in anyway by the `jsx: ReactJSX` compiler option, so these names cost nothing
 * extra to make available.
 */
const REACT_HOOKS = [
  'createContext',
  'forwardRef',
  'memo',
  'useCallback',
  'useContext',
  'useEffect',
  'useId',
  'useLayoutEffect',
  'useMemo',
  'useReducer',
  'useRef',
  'useState',
]

const REACT_TYPES = [
  'CSSProperties',
  'ReactNode',
  'RefObject',
]

/** The `react` half of every block's preamble — identical for all snippets. */
export const REACT_IMPORTS = generateFileImports('react', REACT_HOOKS, REACT_TYPES)

/** Documented packages whose hooks can be imported one at a time. */
const PACKAGES = ['core', 'shared', 'math', 'integrations', 'electron', 'firebase', 'rxjs'] as const

/**
 * Twoslash's own `paths`: `@reause/core/useMouse` resolves to the hook's *source*
 * directory instead of the package barrel.
 *
 * The published packages expose `"./*": "./dist/*"`, but the build emits a single
 * bundled `dist/index.d.ts` per package — there is no `dist/useMouse.d.ts` to
 * land on — so a bare barrel import always drags the package's entire type graph
 * in. `tsconfig.json` maps the same subpaths for the same reason; twoslash needs
 * its own copy because it compiles against a virtual host with no tsconfig, and
 * `config.ts` supplies the `baseUrl` (the repo root) that anchors these.
 */
export const TWOSLASH_PATHS: Record<string, string[]> = Object.fromEntries(
  PACKAGES.map(pkg => [`@reause/${pkg}/*`, [`./packages/${pkg}/*`]]),
)

/** Each hover/error/completion card is emitted as a FloatingVue popper template. */
const POPPER_RE = /<template v-slot:popper[^>]*>[\s\S]*?<\/template>/g

/**
 * `<img>` whose `src` is not absolute — i.e. one the bundler would try to
 * resolve as a page asset.
 */
const RELATIVE_IMG_RE = /<img\b[^>]*\ssrc="(?!https?:|\/\/|\/|data:)[^"]*"[^>]*>/g

/**
 * Drops relative images from twoslash hover cards.
 *
 * Hover cards render the symbol's JSDoc as markdown, and third-party typings
 * reference images by relative path — rxjs ships `// ![](interval.png)` on
 * `interval`, `timeInterval`, … Those `src`es end up in the page template, so
 * VitePress resolves them as assets of the docs page and the production build
 * dies with `Rollup failed to resolve import "interval.png"`. The images are
 * useless inside a hover card (their target is not part of the docs site), so
 * the popup keeps the alt text and loses the tag. Scoped to the popper
 * templates: a `<img>` in a code example is part of the reader-facing snippet
 * and must survive.
 */
export const stripPopupImages: ShikiTransformer = {
  name: 'reause:twoslash-popup-images',
  postprocess(html: string) {
    return html.replace(POPPER_RE, popper => popper.replace(RELATIVE_IMG_RE, ''))
  },
}
