<script setup>
import { AccordionContent, AccordionHeader, AccordionItem, AccordionRoot, AccordionTrigger } from 'reka-ui'
const items = [
  { value: 'a', q: 'Is it accessible?', a: 'Yes. It adheres to the WAI-ARIA design pattern.' },
  { value: 'b', q: 'Is it styled?', a: 'Yes. Blue styles what reka renders, no classes needed.' },
  { value: 'c', q: 'Is it animated?', a: 'Yes. Height animates from --reka-accordion-content-height.' },
]
</script>

<template>
  <AccordionRoot type="single" default-value="a" collapsible>
    <AccordionItem v-for="item in items" :key="item.value" :value="item.value">
      <AccordionHeader>
        <AccordionTrigger>{{ item.q }}</AccordionTrigger>
      </AccordionHeader>
      <AccordionContent>
        <p>{{ item.a }}</p>
      </AccordionContent>
    </AccordionItem>
  </AccordionRoot>
</template>
