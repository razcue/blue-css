<script setup>
import { CollapsibleContent, CollapsibleRoot, CollapsibleTrigger } from 'reka-ui'
</script>

<template>
  <CollapsibleRoot default-open>
    <CollapsibleTrigger>Toggle repositories</CollapsibleTrigger>
    <CollapsibleContent>
      <ul>
        <li>reka-ui/reka-ui</li>
        <li>unovue/shadcn-vue</li>
      </ul>
    </CollapsibleContent>
  </CollapsibleRoot>
</template>
