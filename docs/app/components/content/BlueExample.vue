<script setup lang="ts">
// A live preview of the code block(s) it wraps, rendered with the real Blue CSS.
//
//   ::blue-example
//   ```html
//   <button data-variant="outline">Cancel</button>
//   ```
//   ::
//
// The first `html` block is rendered (in an isolated iframe, so Blue never
// touches this Docus page and Tailwind never touches the preview); every block
// is shown below it. Height follows the content unless `height` is set.
import type { VNode } from 'vue'

const props = withDefaults(defineProps<{
  height?: number | string
  center?: boolean
  padding?: string
}>(), { center: false, padding: '1.5rem' })

const slots = useSlots()
const appConfig = useAppConfig()
const { app } = useRuntimeConfig()
const colorMode = useColorMode()

/** Find the raw source of the first html code block among the slot's vnodes. */
function findHtml(nodes: VNode[] | undefined): string | undefined {
  for (const node of nodes ?? []) {
    const p = node?.props as Record<string, unknown> | null
    if (p && typeof p.code === 'string' && (p.language === 'html' || !p.language)) return p.code
    const children = node?.children
    if (Array.isArray(children)) {
      const found = findHtml(children as VNode[])
      if (found) return found
    }
    else if (children && typeof children === 'object' && 'default' in children) {
      const found = findHtml((children as { default: () => VNode[] }).default())
      if (found) return found
    }
  }
}

const html = computed(() => findHtml(slots.default?.()) ?? '')
const theme = computed(() => (colorMode.value === 'dark' ? 'dark' : 'light'))
const cssHref = computed(() => `${app.baseURL}${(appConfig.blue as { css: string }).css}`)

const srcdoc = computed(() => `<!doctype html>
<html lang="en" data-theme="${theme.value}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<base target="_blank">
<link rel="stylesheet" href="${cssHref.value}">
<style>
  /* Preview harness only: let the frame size itself to the example. */
  body { min-height: 0; padding: ${props.padding}; }
  ${props.center ? 'body { display: grid; place-items: center; }' : ''}
</style>
</head>
<body>
${html.value}
</body>
</html>`)

const frame = ref<HTMLIFrameElement>()
const autoHeight = ref(160)
let observer: ResizeObserver | undefined

function measure() {
  const doc = frame.value?.contentDocument
  if (!doc?.body) return
  autoHeight.value = Math.max(48, Math.ceil(doc.documentElement.scrollHeight))
}

function onLoad() {
  observer?.disconnect()
  if (props.height) return
  measure()
  const body = frame.value?.contentDocument?.body
  if (body && 'ResizeObserver' in window) {
    observer = new ResizeObserver(measure)
    observer.observe(body)
  }
}

onBeforeUnmount(() => observer?.disconnect())

const frameHeight = computed(() => {
  if (!props.height) return `${autoHeight.value}px`
  return typeof props.height === 'number' || /^\d+$/.test(props.height) ? `${props.height}px` : props.height
})
</script>

<template>
  <div class="blue-example not-prose my-5 overflow-hidden rounded-xl border border-default">
    <div class="flex items-center gap-2 border-b border-default bg-elevated px-4 py-2 text-xs text-muted">
      <UIcon name="i-lucide-eye" class="size-3.5" />
      <span>Rendered with Blue CSS · no classes</span>
    </div>
    <ClientOnly>
      <iframe
        ref="frame"
        :srcdoc="srcdoc"
        :style="{ height: frameHeight }"
        class="block w-full"
        title="Blue CSS preview"
        loading="lazy"
        @load="onLoad"
      />
      <template #fallback>
        <div :style="{ height: frameHeight }" />
      </template>
    </ClientOnly>
    <div class="blue-example-code border-t border-default">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.blue-example-code :deep(pre),
.blue-example-code :deep(.my-5) {
  margin: 0;
}
.blue-example-code :deep(> div),
.blue-example-code :deep(pre) {
  border: 0;
  border-radius: 0;
}
</style>
