<script setup lang="ts">
// "On your own" vs "with Blue CSS", one row per concern; rows slide in once when visible.
interface Row { topic: string, without: string, with: string }
withDefaults(defineProps<{ rows: Row[], withoutTitle?: string, withTitle?: string }>(), {
  withoutTitle: 'On your own',
  withTitle: 'With Blue CSS',
})
const root = ref<HTMLElement>()
const armed = ref(false)
const playing = ref(false)
onMounted(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !root.value) return
  armed.value = true
  const io = new IntersectionObserver((entries) => {
    if (entries.some(e => e.isIntersecting)) {
      playing.value = true
      io.disconnect()
    }
  }, { threshold: 0.2 })
  io.observe(root.value)
})
</script>

<template>
  <div ref="root" class="not-prose w-full overflow-hidden rounded-xl border border-default text-left" :class="{ armed, playing }">
    <div class="hidden grid-cols-[minmax(9rem,0.8fr)_1fr_1fr] gap-4 border-b border-default bg-elevated px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted md:grid">
      <span />
      <span class="flex items-center gap-1.5"><UIcon name="i-lucide-x" class="size-4 text-[#ff5f57]" />{{ withoutTitle }}</span>
      <span class="flex items-center gap-1.5"><UIcon name="i-lucide-check" class="size-4 text-primary" />{{ withTitle }}</span>
    </div>
    <div
      v-for="(row, i) in rows"
      :key="i"
      class="row grid gap-1 border-b border-default px-5 py-3.5 last:border-b-0 md:grid-cols-[minmax(9rem,0.8fr)_1fr_1fr] md:gap-4"
      :style="{ '--d': `${0.08 * i}s` }"
    >
      <span class="text-sm font-semibold text-highlighted">{{ row.topic }}</span>
      <span class="flex items-start gap-2 text-sm text-muted">
        <UIcon name="i-lucide-x" class="mt-0.5 size-4 shrink-0 text-[#ff5f57] md:hidden" />{{ row.without }}
      </span>
      <span class="flex items-start gap-2 text-sm text-toned">
        <UIcon name="i-lucide-check" class="mt-0.5 size-4 shrink-0 text-primary md:hidden" />{{ row.with }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.armed .row { opacity: 0; }
.armed.playing .row { animation: rowin 0.4s ease-out var(--d) forwards; }
@keyframes rowin {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: none; }
}
</style>
