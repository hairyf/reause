<script setup lang="ts">
import type { PropType } from 'vue'
import type { CommitInfo } from '../plugins/changelog'
import { computed, onMounted, shallowRef } from 'vue'
import { renderCommitMessage } from '../utils'

/**
 * One `## Changelog` row — React port of VueUse's
 * `packages/.vitepress/theme/components/ChangelogEntry.vue`.
 *
 * Upstream renders the row icons through `unplugin-icons` + `@iconify/json`
 * (`octicon-*` classes resolved at build time). reause carries no icon
 * collection — its UnoCSS `presetIcons` has nothing installed — so the three
 * octicon glyphs are inlined as SVG paths rather than pulling a multi-megabyte
 * icon set in for three icons. The art is the same; the class names are
 * reause's (`overrides.css`) so the layout does not depend on UnoCSS
 * extracting utilities out of the theme components.
 */
const props = defineProps({
  commit: {
    type: Object as PropType<CommitInfo>,
    required: true,
  },
  pending: {
    type: Boolean,
    default: false,
  },
  functionName: {
    type: String,
    required: true,
  },
})

const RELEASES = 'https://github.com/hairyf/reause/releases/tag'
const COMMITS = 'https://github.com/hairyf/reause/commit'

const datetime = shallowRef('')

const isoDateTime = computed(() => new Date(props.commit.date).toISOString())

// Format the date on the client only: `Intl.DateTimeFormat()` yields a
// locale-dependent string, so rendering it during SSG would make the static
// HTML disagree with the hydrated DOM.
onMounted(() => {
  datetime.value = new Intl.DateTimeFormat().format(new Date(props.commit.date))
})
</script>

<template>
  <template v-if="pending && !commit.version">
    <div class="changelog-icon">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <path d="M3.25 1A2.25 2.25 0 0 1 4 5.372v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.251 2.251 0 0 1 3.25 1m9.5 14a2.25 2.25 0 1 1 0-4.5a2.25 2.25 0 0 1 0 4.5M2.5 3.25a.75.75 0 1 0 1.5 0a.75.75 0 0 0-1.5 0M3.25 12a.75.75 0 1 0 0 1.5a.75.75 0 0 0 0-1.5m9.5 0a.75.75 0 1 0 0 1.5a.75.75 0 0 0 0-1.5M14 7.5a1.25 1.25 0 1 1-2.5 0a1.25 1.25 0 0 1 2.5 0m0-4.25a1.25 1.25 0 1 1-2.5 0a1.25 1.25 0 0 1 2.5 0" />
      </svg>
    </div>
    <div>
      <code>Pending for release...</code>
    </div>
  </template>

  <template v-else-if="commit.version">
    <div class="changelog-icon">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <path d="M14.064 0h.186C15.216 0 16 .784 16 1.75v.186a8.752 8.752 0 0 1-2.564 6.186l-.458.459c-.314.314-.641.616-.979.904v3.207c0 .608-.315 1.172-.833 1.49l-2.774 1.707a.749.749 0 0 1-1.11-.418l-.954-3.102a1.214 1.214 0 0 1-.145-.125L3.754 9.816a1.218 1.218 0 0 1-.124-.145L.528 8.717a.749.749 0 0 1-.418-1.11l1.71-2.774A1.748 1.748 0 0 1 3.31 4h3.204c.288-.338.59-.665.904-.979l.459-.458A8.749 8.749 0 0 1 14.064 0ZM8.938 3.623h-.002l-.458.458c-.76.76-1.437 1.598-2.02 2.5l-1.5 2.317 2.143 2.143 2.317-1.5c.902-.583 1.74-1.26 2.499-2.02l.459-.458a7.25 7.25 0 0 0 2.123-5.127V1.75a.25.25 0 0 0-.25-.25h-.186a7.249 7.249 0 0 0-5.125 2.123ZM3.56 14.56c-.732.732-2.334 1.045-3.005 1.148a.234.234 0 0 1-.201-.064.234.234 0 0 1-.064-.201c.103-.671.416-2.273 1.15-3.003a1.502 1.502 0 1 1 2.12 2.12Zm6.94-3.935c-.088.06-.177.118-.266.175l-2.35 1.521.548 1.783 1.949-1.2a.25.25 0 0 0 .119-.213ZM3.678 8.116 5.2 5.766c.058-.09.117-.178.176-.266H3.309a.25.25 0 0 0-.213.119l-1.2 1.95ZM12 5a1 1 0 1 1-2 0a1 1 0 0 1 2 0Z" />
      </svg>
    </div>
    <div>
      <a :href="`${RELEASES}/${commit.version}`" target="_blank" rel="noreferrer">
        <code class="changelog-version">{{ commit.version }}</code>
      </a>
      <span class="changelog-date"> on <time :datetime="isoDateTime">{{ datetime }}</time></span>
    </div>
  </template>

  <template v-else>
    <svg class="changelog-commit-icon" width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M11.93 8.5a4.002 4.002 0 0 1-7.86 0H.75a.75.75 0 0 1 0-1.5h3.32a4.002 4.002 0 0 1 7.86 0h3.32a.75.75 0 0 1 0 1.5Zm-1.43-.75a2.5 2.5 0 1 0-5 0a2.5 2.5 0 0 0 5 0" />
    </svg>
    <div>
      <a :href="`${COMMITS}/${commit.hash}`" target="_blank" rel="noreferrer">
        <code class="changelog-hash">{{ commit.hash.slice(0, 5) }}</code>
      </a>
      <span class="changelog-message">
        -
        <span v-html="renderCommitMessage(commit.message.replace(`(${functionName})`, ''))" />
      </span>
    </div>
  </template>
</template>
