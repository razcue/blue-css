<script setup>
import {
  CheckboxIndicator, CheckboxRoot, Label, RadioGroupIndicator, RadioGroupItem, RadioGroupRoot,
  SliderRange, SliderRoot, SliderThumb, SliderTrack, SwitchRoot, SwitchThumb,
} from 'reka-ui'
import { ref } from 'vue'
const volume = ref([50])
</script>

<template>
  <form>
    <div data-layout="row">
      <SwitchRoot id="airplane" :default-value="true"><SwitchThumb /></SwitchRoot>
      <Label for="airplane">Airplane mode</Label>
    </div>
    <div data-layout="row">
      <CheckboxRoot id="terms" :default-value="true"><CheckboxIndicator /></CheckboxRoot>
      <Label for="terms">Accept terms and conditions</Label>
    </div>
    <RadioGroupRoot default-value="comfortable" aria-label="Density">
      <div data-layout="row">
        <RadioGroupItem id="r1" value="default"><RadioGroupIndicator /></RadioGroupItem>
        <Label for="r1">Default</Label>
      </div>
      <div data-layout="row">
        <RadioGroupItem id="r2" value="comfortable"><RadioGroupIndicator /></RadioGroupItem>
        <Label for="r2">Comfortable</Label>
      </div>
    </RadioGroupRoot>
    <SliderRoot v-model="volume" :max="100" :step="1" aria-label="Volume">
      <SliderTrack><SliderRange /></SliderTrack>
      <SliderThumb />
    </SliderRoot>
  </form>
</template>
