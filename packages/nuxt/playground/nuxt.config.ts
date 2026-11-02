export default defineNuxtConfig({
  modules: ['../src/module.js'],
  compatibilityDate: '2026-01-01',
  devtools: { enabled: false },
  telemetry: false,
  experimental: { componentIslands: true },
  nitro: { prerender: { routes: ['/about'] } },
  blue: { safelist: [] },
})
