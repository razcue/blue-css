<script setup>
import { ToastAction, ToastClose, ToastDescription, ToastProvider, ToastRoot, ToastTitle, ToastViewport } from 'reka-ui'
</script>

<template>
  <ToastProvider>
    <ToastRoot :default-open="true" :duration="1000000">
      <ToastTitle>Scheduled: Catch up</ToastTitle>
      <ToastDescription>Friday, February 10, 2026 at 5:57 PM</ToastDescription>
      <ToastAction alt-text="Undo" data-variant="outline" data-size="sm">Undo</ToastAction>
      <ToastClose aria-label="Close">×</ToastClose>
    </ToastRoot>
    <ToastViewport />
  </ToastProvider>
</template>
