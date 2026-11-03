<script setup>
import { Toggle, ToggleGroupItem, ToggleGroupRoot, ToolbarButton, ToolbarRoot, ToolbarSeparator } from 'reka-ui'
</script>

<template>
  <div data-layout="row">
    <Toggle aria-label="Toggle bold" :default-value="true">B</Toggle>
    <ToggleGroupRoot type="single" default-value="center" aria-label="Text alignment">
      <ToggleGroupItem value="left" aria-label="Left">Left</ToggleGroupItem>
      <ToggleGroupItem value="center" aria-label="Center">Center</ToggleGroupItem>
      <ToggleGroupItem value="right" aria-label="Right">Right</ToggleGroupItem>
    </ToggleGroupRoot>
    <ToolbarRoot aria-label="Formatting">
      <ToolbarButton>Undo</ToolbarButton>
      <ToolbarSeparator />
      <ToolbarButton>Redo</ToolbarButton>
    </ToolbarRoot>
  </div>
</template>
