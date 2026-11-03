<script setup lang="ts">
// The pitch in one picture: plain HTML on the left types itself in, the same
// markup rendered with the real Blue CSS appears on the right.
const props = withDefaults(defineProps<{ title?: string, height?: number }>(), { title: 'login.html', height: 470 })

const source = `<main>
  <article>
    <header>
      <h1>Sign in to Acme</h1>
      <p>Welcome back.</p>
    </header>
    <form>
      <label>Email
        <input type="email" placeholder="ada@acme.dev">
      </label>
      <label>Password
        <input type="password" aria-invalid="true">
        <small>At least 8 characters.</small>
      </label>
      <label><input type="checkbox" checked> Remember me</label>
      <button>Sign in</button>
      <button data-variant="outline">Use GitHub</button>
    </form>
  </article>
</main>`

const lines = source.split('\n')

/** Minimal HTML highlighting: tags, attribute names, attribute values. */
function highlight(line: string) {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return esc(line).replace(/(&lt;\/?)([\w-]+)([^&]*?)(\/?&gt;)/g, (_m, open, tag, attrs, close) => {
    const a = attrs.replace(/([\w-]+)(=)("[^"]*")?/g, (_x: string, n: string, eq: string, v = '') =>
      `<span class="t-attr">${n}</span>${eq}<span class="t-val">${v}</span>`)
      .replace(/ (checked)\b/g, ' <span class="t-attr">$1</span>')
    return `<span class="t-punct">${open}</span><span class="t-tag">${tag}</span>${a}<span class="t-punct">${close}</span>`
  })
}

const appConfig = useAppConfig()
const { app } = useRuntimeConfig()
const colorMode = useColorMode()
const srcdoc = computed(() => `<!doctype html><html data-theme="${colorMode.value === 'dark' ? 'dark' : 'light'}"><head>
<meta charset="utf-8"><link rel="stylesheet" href="${app.baseURL}${(appConfig.blue as { css: string }).css}">
<style>body{min-height:0} main{padding:0 1rem!important} main > article{margin:1rem auto!important}</style>
</head><body>${source}</body></html>`)

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
  }, { threshold: 0.3 })
  io.observe(root.value)
})
</script>

<template>
  <div ref="root" class="hero-demo not-prose grid w-full grid-cols-12 text-left" :class="{ armed, playing }">
    <div class="code col-start-1 col-end-13 row-start-1 self-start overflow-hidden rounded-xl sm:col-end-11 border border-default bg-[#0a1628] shadow-xl shadow-black/10 ring-1 ring-black/5 dark:shadow-black/40">
      <div class="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
        <span class="size-3 rounded-full bg-[#ff5f57]" />
        <span class="size-3 rounded-full bg-[#febc2e]" />
        <span class="size-3 rounded-full bg-[#28c840]" />
        <span class="ml-2 truncate font-mono text-xs text-[#8b9bbd]">{{ props.title }}</span>
        <span class="ml-auto rounded bg-white/5 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-[#8b9bbd]">0 classes</span>
      </div>
      <pre class="overflow-x-auto px-4 py-4 font-mono text-[12.5px] leading-relaxed text-[#cdd9f2]"><code><span
        v-for="(line, i) in lines"
        :key="i"
        class="line"
        :style="{ '--d': `${0.1 + i * 0.07}s` }"
        v-html="highlight(line) + '\n'"
      /></code></pre>
    </div>
    <div class="result z-10 col-start-2 col-end-13 row-start-2 -mt-6 self-start overflow-hidden rounded-xl border border-default bg-default shadow-2xl sm:col-start-5 sm:row-start-1 sm:mt-40 shadow-black/10 dark:shadow-black/40" :style="{ '--d': `${0.2 + lines.length * 0.07}s` }">
      <div class="flex items-center gap-2 border-b border-default bg-elevated px-4 py-2.5 text-xs text-muted">
        <UIcon name="i-lucide-eye" class="size-3.5 text-primary" />
        Rendered with Blue CSS
      </div>
      <ClientOnly>
        <iframe :srcdoc="srcdoc" :style="{ height: `${props.height}px` }" class="block w-full" title="Blue CSS login example" />
        <template #fallback>
          <div :style="{ height: `${props.height}px` }" />
        </template>
      </ClientOnly>
    </div>
  </div>
</template>

<style scoped>
.hero-demo :deep(.t-tag) { color: #7dd3fc; }
.hero-demo :deep(.t-attr) { color: #93c5fd; }
.hero-demo :deep(.t-val) { color: #a7f3d0; }
.hero-demo :deep(.t-punct) { color: #5c6d90; }

.armed .line { opacity: 0; }
.armed.playing .line { animation: reveal 0.3s ease-out var(--d) forwards; }
.armed .result { opacity: 0; transform: translateY(8px); }
.armed.playing .result { animation: rise 0.5s ease-out var(--d) forwards; }

@keyframes reveal {
  from { opacity: 0; transform: translateX(-4px); }
  to { opacity: 1; transform: none; }
}
@keyframes rise {
  to { opacity: 1; transform: none; }
}
</style>
