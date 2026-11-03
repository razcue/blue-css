<script setup>
import { AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogOverlay, AlertDialogPortal, AlertDialogRoot, AlertDialogTitle, AlertDialogTrigger } from 'reka-ui'
</script>

<template>
  <AlertDialogRoot :default-open="true">
    <AlertDialogTrigger data-variant="outline">Delete account</AlertDialogTrigger>
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogContent>
        <header>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>This action cannot be undone. This will permanently delete your account.</AlertDialogDescription>
        </header>
        <footer>
          <AlertDialogCancel data-variant="outline">Cancel</AlertDialogCancel>
          <AlertDialogAction data-variant="destructive">Delete</AlertDialogAction>
        </footer>
      </AlertDialogContent>
    </AlertDialogPortal>
  </AlertDialogRoot>
</template>
