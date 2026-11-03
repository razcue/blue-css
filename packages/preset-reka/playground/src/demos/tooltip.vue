<script setup>
import { TooltipArrow, TooltipContent, TooltipPortal, TooltipProvider, TooltipRoot, TooltipTrigger } from 'reka-ui'
</script>

<template>
  <TooltipProvider>
    <TooltipRoot :default-open="true">
      <TooltipTrigger data-variant="outline">Hover</TooltipTrigger>
      <TooltipPortal>
        <TooltipContent :side-offset="4">Add to library<TooltipArrow /></TooltipContent>
      </TooltipPortal>
    </TooltipRoot>
  </TooltipProvider>
</template>
