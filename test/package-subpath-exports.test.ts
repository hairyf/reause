import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { packages } from '../meta/packages'

// Regression guard for hairyf/reause#998.
//
// `packages/integrations/package.json` omitted one page's explicit subpath entry
// while every other hook in that package had one, so `@reause/integrations/<page>`
// was broken for consumers even though `dist/<page>.js` was built and published.
//
// The failure mode is silent and easy to re-create: `"./*": "./dist/*"` DOES match
// the extensionless subpath, but it maps it to `dist/<page>` — no extension —
// while the build only ever emits `dist/<page>.js`. Resolution therefore
// "succeeds" and the consumer gets `ERR_MODULE_NOT_FOUND` at import time. Nothing
// in the repo catches that until a consumer hits it, which is why this is asserted
// structurally instead of being left to review.
//
// Scope: a package opts into this pattern by declaring at least one per-page
// subpath entry. Only `integrations` and `firebase` do; the other packages
// (`core`, `shared`, `math`, `rxjs`, `electron`) declare none and resolve
// extensionless deep imports through `"./*"` — already broken, uniformly, and
// deliberately out of scope here. Applying the check to them would demand a
// sweep this issue does not authorise, while omitting it entirely would let the
// next `integrations` page repeat #998.
//
// The page glob mirrors `createTsDownConfig()` in the root `tsdown.config.ts`,
// which builds a submodule entry for exactly `*/index.tsx` — so this asserts the
// exports map covers precisely the entrypoints the build emits.

const root = join(import.meta.dirname, '..')

/** Subpaths that are not per-page entries. */
const GENERIC_SUBPATHS = ['.', './*', './package.json']

interface Manifest {
  exports?: Record<string, string>
}

/** Page directories the build turns into submodule entries (`<page>/index.tsx`). */
function pageDirs(packageName: string): string[] {
  const dir = join(root, 'packages', packageName)
  return readdirSync(dir, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && entry.name !== 'node_modules')
    .map(entry => entry.name)
    .filter(page => existsSync(join(dir, page, 'index.tsx')))
    .sort()
}

/** Declared per-page subpaths, excluding the generic ones (`.`, the catch-all, manifest). */
function subpathEntries(pkg: Manifest): string[] {
  return Object.keys(pkg.exports ?? {}).filter(key => !GENERIC_SUBPATHS.includes(key))
}

describe('per-page subpath exports', () => {
  const optedIn: string[] = []

  for (const { name } of packages) {
    const pkg: Manifest = JSON.parse(
      readFileSync(join(root, 'packages', name, 'package.json'), 'utf-8'),
    )

    // A package that declares no per-page subpaths has not opted into the
    // explicit-entry pattern; its deep imports go through `"./*"` only.
    if (subpathEntries(pkg).length === 0) {
      continue
    }

    optedIn.push(name)

    it(`@reause/${name} declares an exports entry for every page`, () => {
      const entries = subpathEntries(pkg)
      const pages = pageDirs(name)
      const missing = pages.filter(page => !entries.includes(`./${page}`))

      expect(
        missing,
        `@reause/${name} builds ${pages.length} pages but declares no exports entry for: `
        + `${missing.join(', ')}. Add "<page>": "./dist/<page>.js" to its exports map — the `
        + `"./*": "./dist/*" catch-all maps the extensionless subpath to an extensionless file, `
        + `so the deep import fails with ERR_MODULE_NOT_FOUND.`,
      ).toEqual([])
    })
  }

  // Guards the guard: if the opt-in detection ever stops matching (a rename, a
  // changed `exports` shape), the loop above silently asserts nothing and this
  // test file becomes the "looks like protection" failure #998 warns about.
  it('detects the packages that opt into explicit per-page subpaths', () => {
    expect(optedIn).toEqual(['integrations', 'firebase'])
  })
})
