<script setup lang="ts">
import type { FunctionInfo } from '../../../../packages/metadata/src/functions'
import { computed } from 'vue'
import { functions } from '../../../../packages/metadata/src/functions'
import exportSizes from '../../../export-size.json'

/**
 * VueUse's `<FunctionInfo>` block, rendered from reause's generated registry
 * instead of a hand-written header note: Category / Export Size / Package /
 * Last Changed / Alias / Related. `packages/.vitepress/plugins/markdownTransform.ts`
 * injects it right after the page's H1.
 *
 * A page is a directory, not a symbol — several exports share one page
 * (`useBreakpoints` covers `breakpointsTailwind` & co.) — so the block describes
 * the export named after the directory and links every related entry by
 * directory, the same rule `FunctionBadge.vue` follows.
 */
const props = defineProps<{ pkg: string, dir: string }>()

const rows = computed(() => functions.filter(fn => fn.pkg === props.pkg && fn.dir === props.dir))
const main = computed<FunctionInfo | undefined>(
  () => rows.value.find(fn => fn.name === props.dir) ?? rows.value[0],
)

/** Min+gzipped size of this one export, as `scripts/export-size.ts` measured it. */
const exportSize = computed(() => {
  const name = main.value?.name
  return name ? (exportSizes as Record<string, string>)[name] : undefined
})

const categoryLink = computed(() => `/functions#category=${encodeURIComponent(main.value?.category ?? '')}`)

function pageLink(name: string): string | undefined {
  const target = functions.find(fn => fn.name === name) ?? functions.find(fn => fn.dir === name)
  return target ? `/${target.pkg}/${target.dir}/` : undefined
}

const aliases = computed(() => main.value?.alias ?? [])
const related = computed(() => (main.value?.related ?? []).map(name => ({ name, link: pageLink(name) })))

const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

/**
 * Last commit touching the hook source as "last year" / "3 months ago", using
 * VueUse's `formatTimeAgo` units and thresholds. Read once per render rather
 * than ticking like upstream's `useTimeAgo`, so the page stays static.
 */
const lastChanged = computed(() => {
  const updated = main.value?.lastUpdated
  if (!updated)
    return undefined
  const diff = Date.now() - updated
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31_536_000_000],
    ['month', 2_592_000_000],
    ['week', 604_800_000],
    ['day', 86_400_000],
    ['hour', 3_600_000],
    ['minute', 60_000],
  ]
  for (const [unit, size] of units) {
    if (Math.abs(diff) >= size)
      return relative.format(-Math.round(diff / size), unit)
  }
  return relative.format(-Math.round(diff / 1000), 'second')
})
</script>

<template>
  <div v-if="main" class="grid grid-cols-[100px_auto] gap-2 text-sm mt-4 mb-8 items-start">
    <div opacity="50">
      Category
    </div>
    <div>
      <a :href="categoryLink">{{ main.category }}</a>
    </div>
    <template v-if="exportSize">
      <div opacity="50">
        Export Size
      </div>
      <div>{{ exportSize }}</div>
    </template>
    <template v-if="pkg !== 'core' && pkg !== 'shared'">
      <div opacity="50">
        Package
      </div>
      <div><code>@reause/{{ pkg }}</code></div>
    </template>
    <template v-if="lastChanged">
      <div opacity="50">
        Last Changed
      </div>
      <div>{{ lastChanged }}</div>
    </template>
    <template v-if="aliases.length">
      <div opacity="50">
        Alias
      </div>
      <div flex="~ gap-1 wrap">
        <code v-for="alias in aliases" :key="alias">{{ alias }}</code>
      </div>
    </template>
    <template v-if="related.length">
      <div opacity="50">
        Related
      </div>
      <div flex="~ gap-1 wrap">
        <template v-for="item in related" :key="item.name">
          <a v-if="item.link" :href="item.link"><code>{{ item.name }}</code></a>
          <code v-else>{{ item.name }}</code>
        </template>
      </div>
    </template>
  </div>
</template>
