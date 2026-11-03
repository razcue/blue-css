<script setup>
import { HoverCardContent, HoverCardPortal, HoverCardRoot, HoverCardTrigger } from 'reka-ui'
</script>

<template>
  <HoverCardRoot :default-open="true">
    <HoverCardTrigger href="#">@vuejs</HoverCardTrigger>
    <HoverCardPortal>
      <HoverCardContent :side-offset="4">
        <h4>@vuejs</h4>
        <p>The Progressive JavaScript Framework – created and maintained by @yyx990803.</p>
        <small>Joined December 2013</small>
      </HoverCardContent>
    </HoverCardPortal>
  </HoverCardRoot>
</template>
