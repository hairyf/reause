<script setup lang="ts">
import type { CommitInfo } from '../plugins/changelog'
import { computed } from 'vue'
import ChangelogEntry from './ChangelogEntry.vue'
// @ts-expect-error virtual module, provided by plugins/changelog.ts
import changelog from '/virtual-changelog'

/**
 * `## Changelog` timeline for a function page — React port of VueUse's
 * `packages/.vitepress/theme/components/Changelog.vue`.
 *
 * Two deliberate adaptations to reause's data:
 * - the prop is the *page directory*, not an export name. A page is a
 *   directory (`packages/<pkg>/<dir>/`) and several exports can share it
 *   (`useBreakpoints` also exports `breakpointsTailwind`, …), while
 *   `getChangeLog()` records the page directory a commit touched. Matching on
 *   the directory therefore needs no alias list — upstream's `alias` lookup
 *   exists only because its rows are keyed by export name.
 * - release rows are global; only the rows touching this page are kept.
 */
const props = defineProps<{ dir: string }>()

const allCommits = changelog as CommitInfo[]

const commits = computed(() => {
  const related = allCommits
    .filter(c => c.version || c.functions?.includes(props.dir))
  // Drop a release row that has no older entry left to introduce, and collapse
  // back-to-back release rows (mirrors upstream).
  return related.filter((row, idx) => {
    if (row.version && (!related[idx + 1] || related[idx + 1]?.version))
      return false
    return true
  })
})
</script>

<template>
  <em v-if="!commits.length" class="changelog-empty">No recent changes</em>

  <div v-else class="changelog">
    <ChangelogEntry
      v-for="(commit, idx) of commits"
      :key="commit.hash"
      :pending="idx === 0"
      :commit="commit"
      :function-name="dir"
    />
  </div>
</template>
