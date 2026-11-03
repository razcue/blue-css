<script setup>
import { AvatarFallback, AvatarImage, AvatarRoot, ProgressIndicator, ProgressRoot, ScrollAreaRoot, ScrollAreaScrollbar, ScrollAreaThumb, ScrollAreaViewport, Separator } from 'reka-ui'
const tags = Array.from({ length: 30 }, (_, i) => `v1.2.0-beta.${30 - i}`)
</script>

<template>
  <div data-layout="row">
    <AvatarRoot role="img" aria-label="Ada Lovelace"><AvatarImage src="data:," alt="" /><AvatarFallback>AL</AvatarFallback></AvatarRoot>
    <AvatarRoot role="img" aria-label="Chris Nash"><AvatarFallback>CN</AvatarFallback></AvatarRoot>
  </div>
  <ProgressRoot :model-value="60"><ProgressIndicator :style="{ transform: 'translateX(-40%)' }" /></ProgressRoot>
  <Separator />
  <p>Text after a separator.</p>
  <ScrollAreaRoot type="always" style="height: 12rem; width: 14rem">
    <ScrollAreaViewport>
      <h4>Tags</h4>
      <p v-for="t in tags" :key="t">{{ t }}</p>
    </ScrollAreaViewport>
    <ScrollAreaScrollbar orientation="vertical"><ScrollAreaThumb /></ScrollAreaScrollbar>
  </ScrollAreaRoot>
</template>
