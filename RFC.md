# RFC 0001 — Blue CSS

Status: **accepted** · Milestone 1 in progress

## 1. Goal

A CSS framework for solo developers building MVPs. **You write good, semantic,
accessible HTML; Blue styles it.** No classes and no custom CSS needed.

Non-goals: a utility system (use Tailwind for that), pixel-perfect marketing
pages, or support for legacy browsers.

## 2. Principles

1. **HTML is the API.** Styling hooks come from, in this order:
   1. Native elements: `<dialog>`, `<details name>`, `popover`, `<search>`,
      `<menu>`, `<hgroup>`, `<meter>`, `<progress>`, `<fieldset>`.
   2. ARIA for state and widgets: `aria-current`, `aria-invalid`, `aria-busy`,
      `aria-selected`, `aria-checked`, `role="tablist|menu|switch|alert|…"`.
   3. A small `data-*` vocabulary, used only where HTML has no semantics for it
      (see §3).
2. **Structure means layout.** `body > header/aside/main/footer` is the app
   shell. `main > header` is a page header. `<article>` is a card.
   `nav > ul` is a menu and `nav > ol` is a breadcrumb.
3. **Low specificity.** Top-level selectors are wrapped in `:where()`. That,
   plus the layer order, means any utility class or one-off rule wins.
4. **Layered.** Everything lives in `@layer blue.*`.
5. **Shippable by default.** The docs are a catalog of HTML recipes. The same
   recipes are the test fixtures and the inputs for checking tree-shaking.

## 3. The data-attribute vocabulary (closed set)

| Attribute      | Values                                                   | Applies to                      |
|----------------|----------------------------------------------------------|---------------------------------|
| `data-variant` | `secondary` `outline` `ghost` `destructive` `link` (buttons) · `secondary` `outline` `destructive` `success` `warning` (badges) · `destructive` `success` `warning` `info` (alerts) | buttons, badges, alerts |
| `data-size`    | `sm` `lg` `icon`                                         | buttons                         |
| `data-badge`   | *(boolean)*                                              | any inline element              |
| `data-layout`  | `grid` `row` `stack` `split`                             | any container                   |
| `data-blue`    | `off`                                                    | opts a subtree out of Blue      |

Adding to this table needs a new RFC. If the set keeps growing, we have
reinvented classes.

`data-layout` lives in the last Blue sub-layer (`blue.containers`), so an
explicit layout always beats an element's own `display`.

Sub-layer order: `tokens, reset, base, layout, components, roles, presets,
containers`.

## 4. Working with Tailwind CSS

- **Layer order.** Projects using both declare:
  `@layer theme, base, blue, components, utilities;`
  Blue then overrides Tailwind's preflight, and utilities override Blue.
- **No class names**, so there are no collisions.
- **shadcn components are excluded.** shadcn and shadcn-vue put `data-slot`
  on every component. Blue's interactive selectors use `:not([data-slot])`, so
  their Tailwind classes are never fought.
- **Subtree opt-out.** Component modules are wrapped in
  `@scope (:root) to ([data-blue="off"])`.
- **Optional reset.** Pass `reset: false` (or `--no-reset`) to drop Blue's reset
  when Tailwind's preflight is present.

## 5. Tokens are shared with shadcn

Blue uses **shadcn's CSS variable names** as its theme contract:

`--background --foreground --card(-foreground) --popover(-foreground)
--primary(-foreground) --secondary(-foreground) --muted(-foreground)
--accent(-foreground) --destructive --border --input --ring --radius
--chart-1…5 --sidebar*`

- Blue declares defaults inside `@layer blue.tokens`. A shadcn theme is
  normally unlayered `:root {}` CSS, and unlayered CSS beats any layer. **So an
  existing shadcn theme automatically restyles Blue**, and one theme drives
  both.
- Dark mode uses `light-dark()` with `color-scheme`. Any of `.dark` (the
  shadcn convention), `[data-theme="dark"]` or the OS preference switches it.
- Tokens Blue adds beyond shadcn's set are prefixed `--blue-*`
  (`--blue-success`, `--blue-font-sans`, …). Where it makes sense, they fall
  back to Tailwind v4 theme variables, e.g.
  `--blue-font-sans: var(--font-sans, system-ui, …)`.

## 6. Presets: reka-ui

Core includes a **roles** layer. It styles any widget with correct ARIA
(`tablist/tab`, `menu/menuitem`, `listbox/option`, `switch`, `checkbox`,
`radio`, `slider`, `tooltip`), whichever headless library produced it.

`@blue-css/preset-reka` (milestone 3) styles reka-ui primitives used
**without** shadcn's Tailwind classes, using only what reka renders. It covers
what is specific to reka:

- `data-state` / `data-side` / `data-highlighted` / `data-disabled` animations
  and states
- `--reka-*` CSS variables (accordion and collapsible heights, popper
  transform-origin, select trigger width, …)
- popper wrapper positioning (`[data-reka-popper-content-wrapper]`), and
  modal vs. popover dialog content (`[role=dialog]:not([data-side])`)

Real shadcn-vue components can sit alongside them: `data-slot` excludes them,
and they share the same tokens.

## 7. Tree-shaking

### Module manifest

The CSS is split into **modules**. Each one declares the tokens that trigger it:

```js
{ id: 'dialog', file: 'dialog.css', layer: 'components',
  triggers: ['tag:dialog', 'attr:role=dialog', 'attr:role=alertdialog'],
  deps: ['motion'] }
```

Token forms:

- `tag:<name>`
- `attr:<name>`
- `attr:<name>=<value>`

Modules marked `always` (tokens, reset, base typography) always ship.
Presets are additional manifests in the same format.

Shaking works per module, not per selector. Purgers that work per selector
are built around classes and are unreliable with `:has()`, `:where()`,
combinators and attribute selectors. Modules make the result predictable.

### Scanning

The scanner is driven by the manifest: it only looks for tokens that some
module cares about. It runs over **what you ship**: emitted HTML **and** JS
chunks. Compiled Vue, React, Svelte, Solid and Angular output keep tag names
and literal attributes as strings:

```js
_createElementVNode("dialog", …)   _createStaticVNode("<table>…")
{ role: "tab", "data-variant": "destructive" }
```

This also catches what libraries render from `node_modules` (reka-ui emits
`role: "tab"` and similar).

- **False positives** (the word `"table"` in a string) only cost a few bytes.
- **False negatives** are bugs. Their sources are `<component :is>`,
  `v-html`, CMS or markdown content, and fully dynamic attribute values.
  Mitigations:
  - a `safelist` (module ids or tokens)
  - `blue-css doctor`, which renders pages (static builds served locally, or a
    running server, optionally crawled) and flags elements whose module was
    not shipped. Each stylesheet declares its modules in a `--blue-modules`
    custom property, so the doctor reads the truth from the live page
  - `scripts/verify.mjs`, which compares screenshots of every example page
    built with the full CSS and with the shaken CSS

### Integrations

Server bundles are scanned for **app modules only**. The unminified Vue
runtime on the server is full of dev messages ("v-model … on `<input>`"), and
everything a library renders also exists in the client bundle anyway.

The Nuxt module does not wrap the Vite plugin. It needs both Vite builds to have
finished, and the CSS has to exist before prerendering. So it computes the CSS
at `nitro:build:before` and writes it at `nitro:build:public-assets`.

All integrations share one engine: `scan(text) → tokens`,
`resolve(tokens) → modules`, `build(modules) → css`.

| Package           | When it runs                                                    |
|-------------------|-----------------------------------------------------------------|
| `@blue-css/cli`   | `blue-css build "dist/**/*.{html,js}" -o dist/blue.css` after any framework build |
| `@blue-css/vite`  | In `generateBundle` it scans the in-memory chunks and the HTML entries, then `emitFile`s the CSS so the content hash is correct, and links it via `transformIndexHtml`. `plugin.api` exposes the result for SSR frameworks |
| `@blue-css/nuxt`  | Scans every client chunk, plus the app's own modules in the server build (via a Vite `transform` hook), so server components and islands are covered. Writes `_nuxt/blue.<hash>.css`; a Nitro `render:html` plugin links it from SSR, prerendered and SPA pages |

During development integrations serve the **full** CSS. Shaking happens only
in production builds.

## 8. Browser baseline

Evergreen browsers. Required: `:has()`, `:where()`, `@layer`, nesting,
`@scope`, `light-dark()`, `color-mix()`, `oklch()`, `:user-invalid`,
`@starting-style`, `popover`. Progressive enhancement: `::details-content`,
`interpolate-size`, `field-sizing`, anchor positioning.

## 9. Repository layout

```
packages/
  core/      CSS modules + manifest (source of truth)
  engine/    scanner, resolver, builder (lightningcss)
  cli/       `blue-css` binary
  vite/      Vite plugin
  nuxt/      Nuxt module
  preset-reka/ (milestone 3)
examples/    HTML recipes = docs = fixtures
```

The proposed `scanner` and `builder` packages were merged into `engine`. They
always ship together, and a separate package would buy nothing yet.

## 10. Milestones

1. **Core + CLI shaker:** modules, manifest, engine, CLI, examples,
   visual verification. ✓
2. Vite plugin ✓, Nuxt module ✓, `blue-css doctor` ✓.
3. `@blue-css/preset-reka`. ← *next*
4. Docs site built from the recipes (dogfooding Blue itself).
