<script setup lang="ts">
const tab = ref('all')
const customers = [
  { id: 1, name: 'Ada Lovelace', status: 'Paid' },
  { id: 2, name: 'Alan Turing', status: 'Pending' },
]
</script>

<template>
  <main>
    <header>
      <hgroup>
        <h1>Customers</h1>
        <p>Everyone who bought something.</p>
      </hgroup>
    </header>
    <div role="tablist">
      <button role="tab" :aria-selected="tab === 'all'" @click="tab = 'all'">All</button>
      <button role="tab" :aria-selected="tab === 'paid'" @click="tab = 'paid'">Paid</button>
    </div>
    <figure>
      <table>
        <thead><tr><th>Name</th><th>Status</th></tr></thead>
        <tbody>
          <tr v-for="c in customers" :key="c.id">
            <td>{{ c.name }}</td>
            <td><span data-badge data-variant="secondary">{{ c.status }}</span></td>
          </tr>
        </tbody>
      </table>
    </figure>
    <!-- Server component: its markup only exists in the server bundle. -->
    <ServerNote />
  </main>
</template>
