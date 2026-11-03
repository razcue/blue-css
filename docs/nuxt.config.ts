// Blue CSS documentation: Docus 5 (Nuxt Content + Nuxt UI).
// GitHub Pages: `pnpm generate:pages` (static, base /blue-css/).
export default defineNuxtConfig({
  extends: ['docus'],
  modules: ['./modules/blue-css'],
  compatibilityDate: '2026-01-01',
  site: {
    name: 'Blue CSS',
    url: process.env.NUXT_SITE_URL || 'https://razcue.github.io',
  },
  // No paid AI assistant; the docs stay readable by agents through llms.txt.
  docus: { assistant: { enabled: false } },
  llms: {
    domain: process.env.NUXT_SITE_URL || 'https://razcue.github.io',
    title: 'Blue CSS',
    description: 'Classless, semantic CSS for MVPs: write accessible HTML, ship only the CSS your build output uses. Works alongside Tailwind CSS, shares shadcn tokens, styles reka-ui primitives.',
  },
  robots: { robotsTxt: !process.env.NUXT_APP_BASE_URL || process.env.NUXT_APP_BASE_URL === '/' },
})
