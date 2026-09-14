import type { ShikiTransformer } from 'shiki'
import { functions } from '../metadata/src/functions'

/**
 * Twoslash support data for the docs site.
 *
 * React adaptation of VueUse's `packages/.vitepress/twoslash.ts`. VueUse builds
 * the injected imports by introspecting the `vue` runtime module
 * (`getModuleExports(vue)`); reause has no single runtime module to introspect —
 * the hooks are spread over seven packages — so the injected names come from the
 * generated function registry (`@reause/metadata`), grouped by the package that
 * documents them.
 *
 * The injected imports are what make *partial* snippets hoverable. Most reause
 * examples are continuation snippets that rely on the surrounding page for
 * context:
 *
 * ```tsx
 * const { x, y } = useMouse({ touch: false })
 * ```
 *
 * Twoslash compiles every code block as its own file, so without an injection
 * that `useMouse` is an unresolved identifier and hovering it would show `any`
 * instead of `function useMouse(options?: UseMouseOptions): UseMouseReturn`.
 * `FILE_IMPORTS` is `// @include`d into every twoslash block and cut from the
 * rendered code, so the injected lines stay invisible to readers.
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
 * Exported hook names per documented package, in registry order. Names are
 * unique across packages (verified by the registry generator's page model), so
 * one import statement per package is unambiguous.
 */
export function reausePackageExports(): Map<string, string[]> {
  const byPackage = new Map<string, string[]>()
  for (const fn of functions) {
    const names = byPackage.get(fn.pkg) ?? []
    if (!names.includes(fn.name))
      names.push(fn.name)
    byPackage.set(fn.pkg, names)
  }
  return byPackage
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

export const FILE_IMPORTS = [
  ...[...reausePackageExports()].map(([pkg, names]) => generateFileImports(`@reause/${pkg}`, names)),
  generateFileImports('react', REACT_HOOKS, REACT_TYPES),
].join('\n')

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
