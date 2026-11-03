<script setup>
import {
  SelectContent, SelectGroup, SelectItem, SelectItemIndicator, SelectItemText, SelectLabel, SelectPortal,
  SelectRoot, SelectSeparator, SelectTrigger, SelectValue, SelectViewport,
} from 'reka-ui'
const fruits = ['Apple', 'Banana', 'Blueberry', 'Grapes', 'Pineapple']
</script>

<template>
  <SelectRoot default-value="Banana" :default-open="true">
    <SelectTrigger aria-label="Fruit"><SelectValue placeholder="Select a fruit" /></SelectTrigger>
    <SelectPortal>
      <SelectContent position="popper" :side-offset="4">
        <SelectViewport>
          <SelectGroup>
            <SelectLabel>Fruits</SelectLabel>
            <SelectItem v-for="f in fruits" :key="f" :value="f">
              <SelectItemText>{{ f }}</SelectItemText>
              <SelectItemIndicator />
            </SelectItem>
          </SelectGroup>
          <SelectSeparator />
          <SelectItem value="none" disabled><SelectItemText>None</SelectItemText></SelectItem>
        </SelectViewport>
      </SelectContent>
    </SelectPortal>
  </SelectRoot>
</template>
