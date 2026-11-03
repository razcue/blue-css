<script setup>
import { DialogClose, DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogRoot, DialogTitle, DialogTrigger } from 'reka-ui'
</script>

<template>
  <DialogRoot :default-open="true">
    <DialogTrigger>Edit profile</DialogTrigger>
    <DialogPortal>
      <DialogOverlay />
      <DialogContent>
        <header>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>Make changes to your profile here. Click save when you're done.</DialogDescription>
        </header>
        <form>
          <label>Name <input value="Ada Lovelace"></label>
          <label>Username <input value="@ada"></label>
        </form>
        <footer>
          <DialogClose data-variant="outline">Cancel</DialogClose>
          <button type="submit">Save changes</button>
        </footer>
        <DialogClose aria-label="Close">×</DialogClose>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
