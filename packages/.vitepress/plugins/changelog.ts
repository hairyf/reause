import type { Plugin } from 'vite'
import { execSync } from 'node:child_process'

/**
 * Virtual module `/virtual-changelog`.
 *
 * Mirrors VueUse's `packages/.vitepress/plugins/changelog.ts`: exposes the
 * commit history as a virtual module consumed by the theme's `Changelog`
 * component on function pages. The data is built once by `getChangeLog()` at
 * config time and handed to the plugin, exactly like upstream.
 */
export interface CommitInfo {
  /** Commit hash (upstream calls this `hash`; kept for the shared component code). */
  hash: string
  message: string
  date: string
  /** Release rows only: the version parsed out of `chore: release vX.Y.Z`. */
  version?: string
  /** Non-release rows: page directories the commit touched under `packages/<pkg>/`. */
  functions?: string[]
}

/** `chore: release vX.Y.Z` — where the release row's version comes from. */
const RELEASE_RE = /chore: release/
/** `packages/<pkg>/<page>/<file>` — the page directory is the second segment. */
const PAGE_FILE_RE = /^packages\/[^/]+\/([^/]+)\//

/**
 * Commit history for the `## Changelog` timeline, in VueUse's shape:
 * one row per release (`version`) or per relevant commit (`functions`).
 *
 * Adaptations from upstream (`source/vueuse/scripts/changelog.ts`):
 * - upstream runs `git log` and then one `git diff-tree` subprocess per
 *   candidate commit; here the changed paths come from the same `git log` via
 *   `--name-only`, so the whole history is a single subprocess (~0.6s for
 *   reause's full 1461 commits) instead of hundreds.
 * - the depth is fixed rather than switched on `CI`: the dev server and the CI
 *   build must produce the same timeline, otherwise a page's changelog would
 *   change depending on where it was built.
 * - upstream's one-entry `whitelistCommits` escape hatch is not ported: it
 *   exists to rescue a single VueUse commit mislabelled as `refactor`, and no
 *   reause commit needs that treatment.
 */
export function getChangeLog(count = 1000): CommitInfo[] {
  let raw: string
  try {
    // A leading \x01 opens every record so a commit body can never be confused
    // with the file list that follows it.
    raw = execSync(
      `git log --pretty=format:\x01%H%x09%s%x09%ad --date=short --name-only -${count}`,
      { encoding: 'utf-8', maxBuffer: 512 * 1024 * 1024 },
    )
  }
  catch {
    // Not a git checkout (e.g. a tarball or a shallow CI export): the section
    // still renders, it just has no history to show.
    return []
  }

  const rows: CommitInfo[] = []

  for (const chunk of raw.split('\x01').filter(Boolean)) {
    const [head, ...files] = chunk.split('\n')
    const [hash, message, date] = head.split('\t')
    if (!hash || !message)
      continue

    if (RELEASE_RE.test(message)) {
      rows.push({ hash, message, date, version: message.split(' ')[2]?.trim() })
      continue
    }

    // VueUse's filter: features, fixes and anything explicitly breaking (`!`).
    if (!message.startsWith('feat') && !message.startsWith('fix') && !message.includes('!'))
      continue

    const functions = [...new Set(
      files
        .map(file => file.match(PAGE_FILE_RE)?.[1])
        .filter((dir): dir is string => Boolean(dir)),
    )]
    if (functions.length)
      rows.push({ hash, message, date, functions })
  }

  return rows
}

export function ChangeLog(data: CommitInfo[]): Plugin {
  return {
    name: 'reause-changelog',
    resolveId(id) {
      if (id === '/virtual-changelog')
        return '\0virtual-changelog'
    },
    load(id) {
      if (id === '\0virtual-changelog')
        return `export default ${JSON.stringify(data)}`
    },
  }
}
