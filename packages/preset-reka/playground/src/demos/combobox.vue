<script setup>
import {
  ComboboxAnchor, ComboboxContent, ComboboxEmpty, ComboboxGroup, ComboboxInput, ComboboxItem,
  ComboboxItemIndicator, ComboboxLabel, ComboboxPortal, ComboboxRoot, ComboboxTrigger, ComboboxViewport,
} from 'reka-ui'
const frameworks = ['Nuxt', 'Next.js', 'SvelteKit', 'Astro', 'Remix']
</script>

<template>
  <ComboboxRoot default-value="Nuxt" :default-open="true">
    <ComboboxAnchor>
      <ComboboxInput placeholder="Search framework…" aria-label="Framework" />
      <ComboboxTrigger aria-label="Show frameworks">▾</ComboboxTrigger>
    </ComboboxAnchor>
    <ComboboxPortal>
      <ComboboxContent position="popper" :side-offset="4">
        <ComboboxViewport>
          <ComboboxEmpty>No framework found.</ComboboxEmpty>
          <ComboboxGroup>
            <ComboboxLabel>Frameworks</ComboboxLabel>
            <ComboboxItem v-for="f in frameworks" :key="f" :value="f">
              {{ f }}<ComboboxItemIndicator />
            </ComboboxItem>
          </ComboboxGroup>
        </ComboboxViewport>
      </ComboboxContent>
    </ComboboxPortal>
  </ComboboxRoot>
</template>
