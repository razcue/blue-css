<script setup>
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from 'reka-ui'
</script>

<template>
  <TabsRoot default-value="account">
    <TabsList aria-label="Manage your account">
      <TabsTrigger value="account">Account</TabsTrigger>
      <TabsTrigger value="password">Password</TabsTrigger>
      <TabsTrigger value="billing" disabled>Billing</TabsTrigger>
    </TabsList>
    <TabsContent value="account"><p>Make changes to your account here.</p></TabsContent>
    <TabsContent value="password"><p>Change your password here.</p></TabsContent>
  </TabsRoot>
</template>
