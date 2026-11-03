<script setup lang="ts">
// A terminal session that plays once when it scrolls into view. Without JS,
// or with prefers-reduced-motion, every line is simply shown.
interface Line {
  t: 'cmd' | 'ok' | 'err' | 'out' | 'info' | 'gap'
  text?: string
}
const props = withDefaults(defineProps<{ title?: string, lines: Line[], replay?: string }>(), { title: '~/app', replay: 'Replay' })

const root = ref<HTMLElement>()
const armed = ref(false)
const playing = ref(false)
const run = ref(0)

const timed = computed(() => {
  let t = 0.3
  return props.lines.map((line) => {
    const start = t
    const typing = line.t === 'cmd' ? Math.max(0.4, (line.text?.length ?? 0) * 0.028) : 0
    t += line.t === 'cmd' ? typing + 0.4 : line.t === 'gap' ? 0.15 : 0.25
    return { ...line, start, typing, chars: (line.text?.length ?? 0) + 2 }
  })
})

function play() {
  playing.value = false
  run.value++
  requestAnimationFrame(() => requestAnimationFrame(() => (playing.value = true)))
}

onMounted(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !root.value) return
  armed.value = true
  const io = new IntersectionObserver((entries) => {
    if (entries.some(e => e.isIntersecting)) {
      playing.value = true
      io.disconnect()
    }
  }, { threshold: 0.4 })
  io.observe(root.value)
})
</script>

<template>
  <div ref="root" class="terminal not-prose w-full overflow-hidden rounded-xl border border-default bg-[#0a1628] text-left shadow-xl shadow-black/10 ring-1 ring-black/5 dark:shadow-black/40" :class="{ armed, playing }">
    <div class="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
      <span class="size-3 rounded-full bg-[#ff5f57]" />
      <span class="size-3 rounded-full bg-[#febc2e]" />
      <span class="size-3 rounded-full bg-[#28c840]" />
      <span class="ml-2 truncate font-mono text-xs text-[#8b9bbd]">{{ title }}</span>
      <button v-if="armed" type="button" class="ml-auto flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-xs text-[#8b9bbd] hover:bg-white/5 hover:text-[#e6efff]" :aria-label="replay" @click="play">
        <UIcon name="i-lucide-rotate-ccw" class="size-3.5" />
        {{ replay }}
      </button>
    </div>
    <div :key="run" class="space-y-1 overflow-x-auto px-4 py-4 font-mono text-[13px] leading-relaxed sm:text-sm">
      <div
        v-for="(line, i) in timed"
        :key="i"
        class="line"
        :class="`l-${line.t}`"
        :style="{ '--d': `${line.start}s`, '--typing': `${line.typing}s`, '--chars': line.chars }"
      >
        <span v-if="line.t === 'cmd'" class="typed"><span class="text-[#60a5fa]">$</span> <span class="text-[#e6efff]">{{ line.text }}</span></span>
        <template v-else-if="line.t === 'ok'"><span class="text-[#28c840]">✓</span> <span class="text-[#a9b7d6]">{{ line.text }}</span></template>
        <template v-else-if="line.t === 'err'"><span class="text-[#ff5f57]">✗</span> <span class="text-[#ffb4ab]">{{ line.text }}</span></template>
        <template v-else-if="line.t === 'info'"><span class="text-[#60a5fa]">{{ line.text }}</span></template>
        <span v-else-if="line.t === 'gap'">&nbsp;</span>
        <span v-else class="text-[#8b9bbd]">{{ line.text }}</span>
      </div>
      <div class="line" :style="{ '--d': `${timed.length ? timed[timed.length - 1]!.start + 0.3 : 0}s` }">
        <span class="text-[#60a5fa]">$</span> <span class="cursor" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.line { white-space: pre; }
.cursor {
  display: inline-block;
  width: 0.6em;
  height: 1.1em;
  vertical-align: text-bottom;
  background: #60a5fa;
  animation: blink 1.1s steps(1) infinite;
}
.armed .line { opacity: 0; }
.armed.playing .line { animation: reveal 0.25s ease-out var(--d) forwards; }
.armed.playing .l-cmd .typed {
  display: inline-block;
  overflow: hidden;
  vertical-align: bottom;
  width: 0;
  animation: type var(--typing) steps(var(--chars)) var(--d) forwards;
}
@keyframes reveal {
  from { opacity: 0; transform: translateY(2px); }
  to { opacity: 1; transform: none; }
}
@keyframes type { to { width: calc(var(--chars) * 1ch); } }
@keyframes blink { 50% { opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .cursor { animation: none; } }
</style>
