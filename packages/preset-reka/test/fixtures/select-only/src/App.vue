<script setup>
import { SelectContent, SelectItem, SelectItemText, SelectPortal, SelectRoot, SelectTrigger, SelectValue, SelectViewport } from 'reka-ui'
</script>

<template>
  <main>
    <SelectRoot>
      <SelectTrigger aria-label="Plan"><SelectValue placeholder="Pick a plan" /></SelectTrigger>
      <SelectPortal>
        <SelectContent position="popper">
          <SelectViewport>
            <SelectItem value="pro"><SelectItemText>Pro</SelectItemText></SelectItem>
          </SelectViewport>
        </SelectContent>
      </SelectPortal>
    </SelectRoot>
  </main>
</template>
