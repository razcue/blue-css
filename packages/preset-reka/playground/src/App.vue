<script setup>
// One demo per page (?c=dialog) so open overlays don't fight; no ?c renders the
// in-flow demos together.
const demos = import.meta.glob('./demos/*.vue', { eager: true })
const byName = Object.fromEntries(
  Object.entries(demos).map(([path, mod]) => [path.match(/([\w-]+)\.vue$/)[1], mod.default]),
)
const inFlow = ['accordion', 'collapsible', 'tabs', 'controls', 'toggles', 'display']
const name = new URLSearchParams(location.search).get('c')
const shown = name ? [name] : inFlow
</script>

<template>
  <header>
    <a href="?">Blue × reka-ui</a>
    <nav>
      <ul>
        <li v-for="n in Object.keys(byName)" :key="n">
          <a :href="`?c=${n}`" :aria-current="n === name ? 'page' : undefined">{{ n }}</a>
        </li>
      </ul>
    </nav>
  </header>
  <main>
    <section v-for="n in shown" :key="n" :id="n">
      <h2>{{ n }}</h2>
      <component :is="byName[n]" />
    </section>
  </main>
</template>
