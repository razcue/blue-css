<script setup lang="ts">
const appConfig = useAppConfig()
</script>

<template>
  <div class="flex items-center gap-1">
    <UButton to="https://razcue.github.io/" target="_blank" icon="i-lucide-globe" size="sm" color="neutral" variant="ghost" label="Author website" />
    <UButton v-if="appConfig.github?.url" :to="appConfig.github.url" target="_blank" icon="i-simple-icons-github" size="sm" color="neutral" variant="ghost" aria-label="GitHub repository" />
  </div>
</template>
