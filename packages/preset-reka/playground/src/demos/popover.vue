<script setup>
import { PopoverArrow, PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui'
</script>

<template>
  <PopoverRoot :default-open="true">
    <PopoverTrigger data-variant="outline">Dimensions</PopoverTrigger>
    <PopoverPortal>
      <PopoverContent :side-offset="4" align="start">
        <header>
          <h4>Dimensions</h4>
          <p>Set the dimensions for the layer.</p>
        </header>
        <label>Width <input value="100%"></label>
        <PopoverArrow />
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>
