<script setup lang="ts">
// Every design token from packages/core/src/tokens.css, with light and dark swatches.
const props = withDefaults(defineProps<{ group?: 'shadcn' | 'blue' }>(), { group: 'shadcn' })
interface Token { name: string, value: string, light: string, dark: string, shadcn: boolean }
const tokens = computed(() => ((useAppConfig().blue as { tokens: Token[] }).tokens)
  .filter(t => (props.group === 'shadcn' ? t.shadcn : !t.shadcn)))
const isColor = (v: string) => /^(oklch|#|rgb|hsl|color-mix)/.test(v)
</script>

<template>
  <div class="not-prose my-5 overflow-x-auto rounded-xl border border-default">
    <table class="w-full text-left text-sm">
      <thead class="bg-elevated text-xs uppercase tracking-wide text-muted">
        <tr>
          <th class="px-4 py-2.5 font-semibold">Token</th>
          <th class="px-4 py-2.5 font-semibold">Light</th>
          <th class="px-4 py-2.5 font-semibold">Dark</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="t in tokens" :key="t.name" class="border-t border-default">
          <td class="px-4 py-2 font-mono text-highlighted">{{ t.name }}</td>
          <template v-if="t.light !== t.dark">
            <td v-for="v in [t.light, t.dark]" :key="v" class="px-4 py-2">
              <span class="flex items-center gap-2">
                <span v-if="isColor(v)" class="size-5 shrink-0 rounded border border-default" :style="{ background: v }" />
                <code class="font-mono text-xs text-muted">{{ v }}</code>
              </span>
            </td>
          </template>
          <td v-else colspan="2" class="px-4 py-2">
            <span class="flex items-center gap-2">
              <span v-if="isColor(t.value)" class="size-5 shrink-0 rounded border border-default" :style="{ background: t.value }" />
              <code class="font-mono text-xs text-muted break-all">{{ t.value }}</code>
            </span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
