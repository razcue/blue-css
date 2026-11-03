<script setup lang="ts">
// Facts from this build of Blue CSS (computed by modules/blue-css.ts), shown as hero badges.
const blue = useAppConfig().blue as {
  version: string
  full: { gzip: number, modules: number }
}
const kb = (n: number) => `${(n / 1024).toFixed(1)} kB`
const items = [
  { icon: 'i-lucide-tag', label: `v${blue.version}` },
  { icon: 'i-lucide-package', label: `${kb(blue.full.gzip)} gzip, everything` },
  { icon: 'i-lucide-boxes', label: `${blue.full.modules} modules` },
  { icon: 'i-lucide-ban', label: '0 classes' },
]
</script>

<template>
  <div class="flex min-h-7 flex-wrap items-center justify-start gap-2">
    <UBadge
      v-for="item in items"
      :key="item.label"
      :icon="item.icon"
      :label="item.label"
      color="neutral"
      variant="outline"
      size="lg"
      class="tabular-nums"
    />
  </div>
</template>
