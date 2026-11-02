<script setup>
import { ref } from 'vue'
const rows = ref([{ id: 1, name: 'Ada' }])
</script>

<template>
  <main>
    <h1>Customers</h1>
    <table>
      <tbody>
        <tr v-for="row in rows" :key="row.id"><td>{{ row.name }}</td></tr>
      </tbody>
    </table>
    <div role="tablist"><button role="tab" aria-selected="true">All</button></div>
  </main>
</template>
