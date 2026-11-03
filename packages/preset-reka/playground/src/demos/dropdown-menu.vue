<script setup>
import {
  DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuItemIndicator,
  DropdownMenuLabel, DropdownMenuPortal, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuRoot,
  DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger,
} from 'reka-ui'
import { ref } from 'vue'
const statusBar = ref(true)
const position = ref('bottom')
</script>

<template>
  <DropdownMenuRoot :default-open="true" :modal="false">
    <DropdownMenuTrigger data-variant="outline">Open menu</DropdownMenuTrigger>
    <DropdownMenuPortal>
      <DropdownMenuContent :side-offset="4" align="start">
        <DropdownMenuLabel>My account</DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem>Profile <kbd>⇧⌘P</kbd></DropdownMenuItem>
          <DropdownMenuItem>Billing <kbd>⌘B</kbd></DropdownMenuItem>
          <DropdownMenuItem disabled>Team (soon)</DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem v-model="statusBar">
          <DropdownMenuItemIndicator />Status bar
        </DropdownMenuCheckboxItem>
        <DropdownMenuRadioGroup v-model="position">
          <DropdownMenuRadioItem value="top"><DropdownMenuItemIndicator />Top</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="bottom"><DropdownMenuItemIndicator />Bottom</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Invite users</DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent><DropdownMenuItem>Email</DropdownMenuItem></DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>
        <DropdownMenuItem data-variant="destructive">Log out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenuRoot>
</template>
