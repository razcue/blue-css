<script setup lang="ts">
// Real tree-shaking results for the example pages in this repository, measured
// when these docs were built: full stylesheet vs. what each page ships.
const props = withDefaults(defineProps<{ savedLabel?: string, source?: string }>(), {
  savedLabel: 'less CSS on the sign-in page',
  source: '',
})
const blue = useAppConfig().blue as {
  full: { gzip: number, modules: number }
  examples: { name: string, gzip: number, modules: number }[]
}
const labels: Record<string, string> = {
  'login': 'Sign-in page',
  'dashboard': 'Dashboard with sidebar, cards, tabs and a table',
  'kitchen-sink': 'Kitchen sink: every recipe on one page',
}
const rows = computed(() => [
  { label: 'Everything Blue ships, untouched', gzip: blue.full.gzip, modules: blue.full.modules, full: true },
  ...blue.examples.map(e => ({ label: labels[e.name] ?? e.name, gzip: e.gzip, modules: e.modules, full: false })),
])
const login = blue.examples.find(e => e.name === 'login')!
const saved = Math.round((1 - login.gzip / blue.full.gzip) * 100)

const root = ref<HTMLElement>()
const progress = ref(1)
onMounted(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !root.value) return
  progress.value = 0
  const io = new IntersectionObserver((entries) => {
    if (!entries.some(e => e.isIntersecting)) return
    io.disconnect()
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 1400)
      progress.value = 1 - (1 - t) ** 3
      if (t < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, { threshold: 0.4 })
  io.observe(root.value)
})
const kb = (n: number) => (n / 1024).toFixed(1)
</script>

<template>
  <div ref="root" class="not-prose w-full rounded-xl border border-default bg-elevated p-5 text-left sm:p-6">
    <div class="flex flex-wrap items-end justify-between gap-2">
      <p class="text-5xl font-bold tracking-tight text-primary tabular-nums sm:text-6xl">
        {{ Math.round(saved * progress) }}%
      </p>
      <p class="pb-2 text-sm text-muted">
        {{ props.savedLabel }}
      </p>
    </div>
    <div class="mt-5 space-y-4">
      <div v-for="row in rows" :key="row.label">
        <div class="mb-1.5 flex justify-between gap-4 text-sm">
          <span class="text-toned">{{ row.label }}</span>
          <span class="shrink-0 whitespace-nowrap font-mono tabular-nums text-highlighted">{{ kb(row.gzip * progress) }} kB · {{ row.modules }} modules</span>
        </div>
        <div class="h-3 overflow-hidden rounded-full bg-accented">
          <div
            class="h-full rounded-full"
            :class="row.full ? 'bg-slate-400/70 dark:bg-slate-500/70' : 'bg-primary'"
            :style="{ width: `${(100 * row.gzip / blue.full.gzip) * progress}%` }"
          />
        </div>
      </div>
    </div>
    <p v-if="props.source" class="mt-4 text-xs text-dimmed">
      {{ props.source }}
    </p>
  </div>
</template>
