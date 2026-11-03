---
seo:
  title: Blue CSS — write good HTML, ship no CSS
  description: Classless, semantic CSS for solo developers building MVPs. Style accessible HTML with no classes, ship only the CSS your build output uses, and keep Tailwind, shadcn and reka-ui alongside.
---

::u-page-hero
---
orientation: horizontal
ui:
  title: text-4xl sm:text-5xl lg:text-[3.4rem] lg:leading-[1.1]
---
#headline
:blue-badges

#title
Write good HTML. Ship [no CSS]{.text-primary}.

#description
Blue CSS styles semantic, accessible HTML — app shells, forms, tables, cards, dialogs, tabs, menus — without a single class or line of CSS. At build time it scans what you ship and keeps only the styles your pages use.

#links
  :::u-button
  ---
  size: xl
  to: /getting-started/installation
  trailing-icon: i-lucide-arrow-right
  ---
  Get started
  :::

  :::u-button
  ---
  color: neutral
  icon: i-simple-icons-github
  size: xl
  to: https://github.com/razcue/blue-css
  variant: outline
  ---
  View on GitHub
  :::

#default
  :::hero-demo
  :::
::

::u-page-section
#title
Only the CSS your pages use

#description
Blue scans your build output — HTML, every JS chunk, even what libraries render — and ships whole modules only when something on your pages needs them. Measured on this repository's example pages when these docs were built.

#default
  :::shake-meter
  ---
  source: Gzipped sizes from blue-css build against examples/*.html. The dashboard ships 13 of 22 core modules; the sign-in page ships 8.
  ---
  :::

  :::compare-rows
  ---
  rows:
    - topic: Styling
      without: Classes on every element, or a stylesheet you write and maintain.
      with: Semantic HTML. Native elements, ARIA state and five data attributes do the rest.
    - topic: Accessibility
      without: Added later, if a reviewer asks.
      with: Built in — tabs, menus, invalid fields and loading states are styled from their ARIA attributes.
    - topic: Bundle size
      without: A whole framework, or a purge step that breaks on dynamic markup.
      with: Tree-shaken per module from what you ship; blue-css doctor catches what a scan can't see.
    - topic: Tailwind
      without: Two systems fighting over specificity.
      with: Its own cascade layer under your utilities. Any class you add wins.
    - topic: shadcn
      without: Copy components in, restyle them by hand to match the rest.
      with: Same token names — one shadcn theme restyles Blue too; shadcn components are left alone.
    - topic: Dark mode
      without: A second set of styles to keep in sync.
      with: light-dark() tokens follow the OS, the .dark class or data-theme.
  ---
  :::
::

::u-page-section
---
orientation: horizontal
---
#title
Tree-shaken from what you ship

#description
The Nuxt module and the Vite plugin serve the full stylesheet in development and shake it in production builds: client chunks, server components and prerendered pages included. Anything else runs the CLI after its build.

#links
  :::u-button
  ---
  color: neutral
  variant: outline
  to: /integrations/nuxt
  trailing-icon: i-lucide-arrow-right
  ---
  Integrations
  :::

#default
  :::terminal-demo
  ---
  title: ~/shop
  lines:
    - { t: cmd, text: "nuxi build" }
    - { t: out, text: "✓ Client built in 1.2s" }
    - { t: out, text: "✓ Server built in 1.0s" }
    - { t: info, text: "[blue-css] blue.HqmS9e2I.css: 13 modules shipped, 9 shaken" }
    - { t: info, text: "           23.4 kB (5.6 kB gzip)" }
    - { t: ok, text: "Nuxt Nitro server built" }
    - { t: gap }
    - { t: cmd, text: "blue-css doctor http://localhost:3000 --crawl" }
    - { t: out, text: "Inspected 12 page(s)" }
    - { t: ok, text: "every element Blue styles had its module shipped" }
  ---
  :::
::

::u-page-section
---
orientation: horizontal
reverse: true
---
#title
Alongside Tailwind, shadcn and reka-ui

#description
Declare the layer order once. Utilities beat Blue, Blue beats Tailwind's reset, shadcn components keep their own classes, and the reka-ui preset styles bare primitives with the same tokens.

#links
  :::u-button
  ---
  color: neutral
  variant: outline
  to: /getting-started/tailwind-and-shadcn
  trailing-icon: i-lucide-arrow-right
  ---
  Tailwind and shadcn
  :::

#default
```css [main.css]
@layer theme, base, blue, components, utilities;
@import "tailwindcss";

/* Your shadcn theme is unlayered, so it wins —
   one set of tokens drives shadcn and Blue. */
:root {
  --primary: oklch(0.205 0 0);
  --radius: 0.625rem;
}
```
::

::u-page-section
#title
How it works

#features
  :::u-page-feature
  ---
  icon: i-lucide-code-xml
  to: /recipes/app-shell
  ---
  #title
  Write semantic HTML

  #description
  `<main>`, `<article>`, `<dialog>`, `<details>`, `role="tablist"`, `aria-invalid`. Structure is layout; ARIA is state.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-hammer
  to: /integrations/vite
  ---
  #title
  Build as usual

  #description
  Nuxt, Vite or any framework. Blue reads the output, not your source, so runtime libraries are covered.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-package-check
  to: /reference/modules
  ---
  #title
  Ship what's used

  #description
  Each module declares what triggers it. A page with no table never downloads table styles.
  :::
::

::u-page-section
#title
What you get

#features
  :::u-page-feature
  ---
  icon: i-lucide-layout-dashboard
  to: /recipes/app-shell
  ---
  #title
  App-ready recipes

  #description
  Sidebar shells, page headers, stat cards, sign-in pages, forms, tables, alerts — all from plain elements.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-accessibility
  to: /recipes/aria-widgets
  ---
  #title
  ARIA widgets, any library

  #description
  Tabs, menus, listboxes, switches and toolbars styled by role — from reka-ui, Radix, Ark or your own markup.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-palette
  to: /reference/tokens
  ---
  #title
  shadcn tokens

  #description
  `--background`, `--primary`, `--radius`… one theme for Blue and shadcn, light and dark.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-component
  to: /integrations/reka-ui
  ---
  #title
  reka-ui preset

  #description
  Dialogs, popovers, selects, comboboxes, accordions and toasts from bare reka-ui primitives, shaken per component.
  :::

  :::u-page-feature
  ---
  icon: i-simple-icons-nuxtdotjs
  to: /integrations/nuxt
  ---
  #title
  Nuxt and Vite

  #description
  One line of config. Full CSS in dev, a content-hashed, shaken file in production.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-stethoscope
  to: /integrations/doctor
  ---
  #title
  blue-css doctor

  #description
  Renders your pages and lists elements whose styles were shaken away — CMS content, v-html, dynamic tags.
  :::
::

::u-page-c-t-a
---
title: Start with one module
description: Nuxt 3.10+ or Vite 5+. No runtime JavaScript is added to your app.
variant: subtle
links:
  - label: Read the installation guide
    to: /getting-started/installation
    trailingIcon: i-lucide-arrow-right
  - label: Browse the recipes
    to: /recipes/app-shell
    color: neutral
    variant: outline
---
```ts [nuxt.config.ts]
export default defineNuxtConfig({
  modules: ['@blue-css/nuxt'],
})
```
::
