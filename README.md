# Blue CSS

**Write good HTML. Ship no CSS.**

Blue is a classless CSS framework for solo developers building MVPs. It styles
semantic, accessible HTML (app shells, forms, tables, cards, dialogs, tabs,
menus) with no classes and no custom CSS. At build time it ships only the
styles your output actually uses.

- **HTML is the API.** Native elements, ARIA state and a five-attribute
  `data-*` vocabulary.
- **Works alongside Tailwind.** Blue lives in its own cascade layer, uses
  zero-specificity selectors and leaves shadcn components (`[data-slot]`) alone.
- **Shares shadcn's tokens.** Your existing shadcn theme restyles Blue
  automatically.
- **Tree-shaken from what you ship.** The CLI scans your built HTML and JS
  chunks, including what libraries such as reka-ui render.

See [RFC.md](./RFC.md) for the design and roadmap.

> Status: milestones 1–3 done (core, CLI, Vite plugin, Nuxt module,
> `blue-css doctor`, reka-ui preset). Next: a docs site built from the recipes.

## Quick start

### Nuxt

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@blue-css/nuxt'],
  blue: {
    safelist: [],   // module ids or tokens for content rendered at runtime
    content: [],    // extra globs to scan, e.g. 'content/**/*.md'
  },
})
```

- `nuxi dev` serves the full stylesheet.
- `nuxi build` and `nuxi generate` scan every client chunk plus the app's own
  server modules, so server components and islands are covered.
- The module writes `_nuxt/blue.<hash>.css`, which Nitro serves with immutable
  caching, and links it from every SSR, prerendered and SPA page.

### Vite

```js
// vite.config.js
import blue from '@blue-css/vite'

export default defineConfig({ plugins: [blue()] })
```

- `vite dev` links the full stylesheet from `index.html`.
- `vite build` scans the final bundle (every chunk, including what libraries in
  `node_modules` render) and the HTML entries.
- It emits `assets/blue-<hash>.css` and links it. For SSR setups without an
  `index.html`, pass `inject: false` and read `plugin.api.href`.

### reka-ui (the shadcn-vue primitives), with no classes

```js
import reka from '@blue-css/preset-reka'

blue({ presets: [reka] })                                 // Vite
export default defineNuxtConfig({ blue: { presets: ['@blue-css/preset-reka'] } })  // Nuxt
```

Use reka-ui's unstyled primitives as they are:

```vue
<DialogRoot>
  <DialogTrigger>Edit profile</DialogTrigger>
  <DialogPortal>
    <DialogOverlay />
    <DialogContent>
      <header><DialogTitle>Edit profile</DialogTitle><DialogDescription>…</DialogDescription></header>
      <form>…</form>
      <footer><DialogClose data-variant="outline">Cancel</DialogClose><button>Save</button></footer>
    </DialogContent>
  </DialogPortal>
</DialogRoot>
```

- **Covered:** Accordion, AlertDialog, Avatar, Checkbox, Collapsible,
  Combobox, ContextMenu, Dialog, DropdownMenu, HoverCard, Label, Menubar,
  Popover, Progress, RadioGroup, ScrollArea, Select, Separator, Slider, Switch,
  Tabs, Toast, Toggle, ToggleGroup, Toolbar and Tooltip.
- **Shaken per component:** each part ships only if your bundle imports it.
- **Three recipes to know:**
  - give `AvatarRoot` `role="img"` and an `aria-label`;
  - set Progress's indicator transform as reka's docs show;
  - put a `DialogClose` directly in `DialogContent` (outside header and
    footer) and it becomes the corner "×".
- **Try it:** `packages/preset-reka/playground` renders every covered primitive
  (`?c=dialog`, `?c=select`, …).

### Anything else

```html
<!-- once published; until then: pnpm build → packages/core/dist/blue.min.css -->
<link rel="stylesheet" href="https://unpkg.com/@blue-css/core/dist/blue.min.css">
```

In production, run the CLI **after** your framework builds:

```bash
vite build && blue-css build dist -o dist/assets/blue.css --report
```

```
  modules   8 shipped, 13 shaken
  size      21.3 kB (5.4 kB gzip)
  full      41.1 kB (8.3 kB gzip) → 36% smaller
```

## Recipes

### App shell

The element that directly contains `<main>` is the shell: `<body>`, or the
`#app` / `#__nuxt` wrapper.

```html
<body>
  <aside>                              <!-- optional: full-height sidebar -->
    <a href="/">Acme</a>
    <nav><h2>Platform</h2><ul><li><a href="/" aria-current="page">Dashboard</a></li></ul></nav>
  </aside>
  <header>                             <!-- sticky site header -->
    <nav><ol><li><a href="/">Home</a></li><li aria-current="page">Dashboard</li></ol></nav>  <!-- breadcrumb -->
  </header>
  <main>
    <header>                           <!-- page header -->
      <hgroup><h1>Dashboard</h1><p>Overview</p></hgroup>
      <menu><li><button>New invoice</button></li></menu>
    </header>
    …
  </main>
  <footer>…</footer>
</body>
```

### Cards and grids

```html
<ul data-layout="grid">
  <li>
    <article>
      <header><h3>Create project</h3><p>Deploy in one click.</p></header>
      <p>…</p>
      <footer><button data-variant="outline">Cancel</button><button>Deploy</button></footer>
    </article>
  </li>
</ul>
```

A lone `<article>` in `<main>` that contains a `<form>` becomes a centered
sign-in style card. Without a form, it renders as a readable blog post.

### Forms

```html
<form>
  <label>Email <input type="email" required></label>
  <label>
    Username <input aria-invalid="true" aria-describedby="u-help">
    <small id="u-help">This username is already taken.</small>
  </label>
  <label><input type="checkbox" role="switch"> Marketing emails</label>
  <fieldset role="group"><input type="email" aria-label="Email"><button>Subscribe</button></fieldset>
  <button type="submit">Save</button> <button type="reset">Reset</button>
</form>
```

### Feedback and overlays

```html
<div role="alert" data-variant="destructive"><strong>Payment failed</strong><p>…</p></div>
<span data-badge data-variant="success">Paid</span>
<button aria-busy="true">Saving</button>
<progress value="60" max="100"></progress>
<details name="faq"><summary>Question</summary><p>Answer</p></details>
<dialog closedby="any"><header><h2>Sure?</h2></header><form method="dialog"><footer>…</footer></form></dialog>
<div id="p" popover>…</div>
```

### ARIA widgets (any headless library)

```html
<div role="tablist"><button role="tab" aria-selected="true">Account</button>…</div>
<div role="menu"><div role="menuitem">Profile <kbd>⌘P</kbd></div>…</div>
<button role="switch" aria-checked="true"><span></span></button>
```

### The `data-*` vocabulary

| Attribute      | Values |
|----------------|--------|
| `data-variant` | buttons: `secondary` `outline` `ghost` `destructive` `link` · badges: `secondary` `outline` `destructive` `success` `warning` · alerts: `destructive` `success` `warning` `info` |
| `data-size`    | buttons: `sm` `lg` `icon` |
| `data-badge`   | marks an inline element as a badge |
| `data-layout`  | `grid` `row` `stack` `split` |
| `data-blue`    | `off` opts a subtree out |

All of these are in [`examples/`](./examples): `kitchen-sink.html`,
`dashboard.html` and `login.html`.

## With Tailwind CSS and shadcn

Declare the layer order once, before importing either:

```css
@layer theme, base, blue, components, utilities;
@import "tailwindcss";
@import "@blue-css/core/blue.css"; /* declares its own blue.* sub-layers */
```

- Utilities always beat Blue, and Blue beats Tailwind's preflight. Build with
  `--no-reset` to rely on preflight alone.
- Blue uses shadcn's variable names (`--background`, `--primary`, `--radius`,
  …). Your shadcn theme is unlayered, so it wins, and one theme drives both.
- shadcn components carry `data-slot`, which Blue skips.
- Dark mode follows the OS by default, and the `.dark` class or
  `data-theme="dark"` forces it.

## Tree-shaking

```bash
blue-css build [content...] -o out.css    # scan built output, write what's used
blue-css full -o out.css                  # everything
blue-css scan [content...] [--json]       # what was detected, and why
```

Options: `--safelist dialog,attr:role=tab`, `--preset <pkg>`, `--no-reset`,
`--no-minify`, `--report`.

Or use a `blue.config.mjs`:

```js
import { defineConfig } from '@blue-css/engine'

export default defineConfig({
  content: ['.output/public', '.output/server/chunks'],
  out: '.output/public/blue.css',
  safelist: ['details'],   // for CMS/markdown content rendered at runtime
})
```

How it works:

- Each CSS module declares the tokens that trigger it (`tag:dialog`,
  `attr:role=tab`, `attr:popover`).
- The scanner looks only for those tokens, in HTML and in compiled JS
  (`createElementVNode("dialog"`, `jsx("table"`, `role: "tab"`).
- Blue ships whole modules, never individual selectors, so the result stays
  predictable with `:has()` and attribute selectors.
- Over-inclusion costs bytes. Missing a module is a bug, so cover dynamic
  content with `safelist`.

## Checking rendered pages: `blue-css doctor`

The scanner reads build output, so markup that only appears at runtime can be
missed. That includes `v-html`, CMS or markdown content, `<component :is>` and
fully dynamic attributes. The doctor renders real pages in a headless browser
and compares the live DOM with what each page's stylesheet shipped.

```bash
blue-css doctor dist                                # static build: every *.html is a starting page
blue-css doctor http://localhost:3000 --crawl       # SSR app: start it first, follow same-origin links
```

```
Missing modules (2): elements on these pages have no Blue styles
  ✗ dialog (+ motion)  on /cms.html
      tag:dialog ×1
        dialog#promo
  ✗ tabs  on /cms.html
      attr:role=tablist ×1
        main#content > div[role=tablist]

This markup only exists at runtime (v-html, CMS/markdown content, dynamic tags),
so the build-time scan could not see it. Ship the modules anyway with:
  safelist: ['dialog', 'tabs']
```

- It exits with code 1 when something is missing, so it can gate CI.
- `--json` gives machine-readable output.
- It also lists modules that were shipped but unused on every inspected page,
  which hints that the scan over-included.
- Every Blue stylesheet declares what it contains in a `--blue-modules` custom
  property on `:root`. That's how the doctor works no matter which integration
  delivered the CSS.
- Content that appears only after interaction (menus, portals that mount when
  opened) isn't in the DOM at load time. `--wait <ms>` helps with late client
  rendering, but interaction-only markup still needs the `safelist`.
- The doctor needs Playwright: `npm i -D playwright && npx playwright install chromium`.

## Development

```bash
pnpm install
pnpm test      # engine, CLI, Vite (real builds) and Nuxt (end-to-end build) tests
pnpm build     # packages/core/dist/blue.css (+ .min.css)
pnpm verify    # screenshots every example with full vs. shaken CSS; must be pixel-identical
```

```
packages/core     CSS modules + manifest.js (the source of truth)
packages/engine   scanner, resolver, builder (lightningcss)
packages/cli      the `blue-css` binary
packages/vite     Vite plugin (test/fixtures/app is a Vue app)
packages/nuxt     Nuxt module (playground/ is a Nuxt app with a server component)
examples/         HTML recipes = docs = verification fixtures
```
