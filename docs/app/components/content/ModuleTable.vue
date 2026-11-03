<script setup lang="ts">
// Every CSS module and what triggers it, read from the manifests when the docs were built.
const props = withDefaults(defineProps<{ manifest?: string }>(), { manifest: '@blue-css/core' })
interface Mod { id: string, manifest: string, layer: string, always: boolean, triggers: string[], deps: string[] }
const modules = computed(() => ((useAppConfig().blue as { modules: Mod[] }).modules).filter(m => m.manifest === props.manifest))
</script>

<template>
  <div class="not-prose my-5 overflow-x-auto rounded-xl border border-default">
    <table class="w-full text-left text-sm">
      <thead class="bg-elevated text-xs uppercase tracking-wide text-muted">
        <tr>
          <th class="px-4 py-2.5 font-semibold">Module</th>
          <th class="px-4 py-2.5 font-semibold">Layer</th>
          <th class="px-4 py-2.5 font-semibold">Ships when the output contains</th>
          <th class="px-4 py-2.5 font-semibold">Needs</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="m in modules" :key="m.id" class="border-t border-default align-top">
          <td class="px-4 py-2.5 font-mono text-highlighted">{{ m.id }}</td>
          <td class="px-4 py-2.5 font-mono text-muted">blue.{{ m.layer }}</td>
          <td class="px-4 py-2.5">
            <UBadge v-if="m.always" label="always" color="primary" variant="subtle" />
            <span v-else-if="!m.triggers.length" class="text-muted">only as a dependency</span>
            <span class="flex flex-wrap gap-1">
              <code v-for="t in m.triggers" :key="t" class="rounded bg-accented px-1.5 py-0.5 font-mono text-xs text-toned">{{ t }}</code>
            </span>
          </td>
          <td class="px-4 py-2.5 font-mono text-xs text-muted">{{ m.deps.join(', ') || '—' }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
