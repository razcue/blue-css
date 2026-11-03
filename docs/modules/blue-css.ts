/**
 * Dogfooding: the docs render every recipe with the real Blue CSS.
 *
 * - Builds the full stylesheet (core + reka preset) and serves it at
 *   <baseURL>blue-css/blue.css for the live previews (isolated iframes, so
 *   Blue never touches the Docus/Tailwind page itself).
 * - Exposes build facts to the app (useAppConfig().blue): sizes, per-example
 *   tree-shaking results, every module with its triggers, every design token.
 */
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineNuxtModule } from '@nuxt/kit'
import { buildCss, contentHash, core } from '@blue-css/engine'
import reka from '@blue-css/preset-reka'

const repo = fileURLToPath(new URL('../../', import.meta.url))

/** `--name: value;` declarations from the :root block of tokens.css. */
async function readTokens() {
  const css = await readFile(join(core.dir, 'tokens.css'), 'utf8')
  const root = css.slice(css.indexOf(':root {'), css.indexOf('\n}', css.indexOf(':root {')))
  const tokens = []
  for (const m of root.matchAll(/(--[\w-]+):\s*([^;]+);/g)) {
    const value = m[2].replace(/\s+/g, ' ').trim()
    const pair = /^light-dark\((.+)\)$/.exec(value)
    let light = value
    let dark = value
    if (pair) {
      // Split light-dark(a, b) at its top-level comma.
      let depth = 0
      const s = pair[1]
      for (let i = 0; i < s.length; i++) {
        if (s[i] === '(') depth++
        else if (s[i] === ')') depth--
        else if (s[i] === ',' && depth === 0) {
          light = s.slice(0, i).trim()
          dark = s.slice(i + 1).trim()
          break
        }
      }
    }
    tokens.push({ name: m[1], value, light, dark, shadcn: !m[1].startsWith('--blue-') })
  }
  return tokens
}

/**
 * Every page under content/, as a route: `2.recipes/4.forms.md` → `/recipes/forms`.
 * Listed for prerendering because Nitro's crawler does not follow links that
 * carry a base path (NUXT_APP_BASE_URL=/blue-css/ on GitHub Pages).
 */
async function contentRoutes(dir: string, prefix = ''): Promise<string[]> {
  const strip = (name: string) => name.replace(/^\d+\./, '')
  const routes: string[] = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) routes.push(...(await contentRoutes(join(dir, entry.name), `${prefix}/${strip(entry.name)}`)))
    else if (entry.name.endsWith('.md')) {
      const slug = strip(entry.name.replace(/\.md$/, ''))
      routes.push(slug === 'index' ? prefix || '/' : `${prefix}/${slug}`)
    }
  }
  return routes
}

export default defineNuxtModule({
  meta: { name: 'blue-css-docs' },
  async setup(_options, nuxt) {
    const manifests = [core, reka]
    const full = await buildCss({ full: true, presets: [reka] })
    const fullCoreOnly = await buildCss({ full: true })

    const dir = join(nuxt.options.rootDir, '.blue-css')
    await mkdir(dir, { recursive: true })
    await writeFile(join(dir, 'blue.css'), full.css)
    nuxt.options.nitro.publicAssets ||= []
    nuxt.options.nitro.publicAssets.push({ dir, baseURL: '/blue-css', maxAge: 0 })

    nuxt.options.nitro.prerender ||= {}
    nuxt.options.nitro.prerender.routes = [
      ...(nuxt.options.nitro.prerender.routes ?? []),
      ...(await contentRoutes(join(nuxt.options.rootDir, 'content'))),
    ]

    const examples = []
    for (const name of ['login', 'dashboard', 'kitchen-sink']) {
      const r = await buildCss({ content: [join(repo, 'examples', `${name}.html`)] })
      examples.push({ name, bytes: r.bytes, gzip: r.gzip, modules: r.included.length })
    }

    const pkg = JSON.parse(await readFile(join(repo, 'packages/core/package.json'), 'utf8'))

    nuxt.options.appConfig.blue = {
      version: pkg.version,
      css: `blue-css/blue.css?v=${contentHash(full.css)}`,
      full: { bytes: fullCoreOnly.bytes, gzip: fullCoreOnly.gzip, modules: fullCoreOnly.included.length },
      fullWithReka: { bytes: full.bytes, gzip: full.gzip, modules: full.included.length },
      examples,
      modules: manifests.flatMap((m) =>
        m.modules.map((mod) => ({
          id: mod.id,
          manifest: m.name,
          layer: mod.layer,
          always: Boolean(mod.always),
          triggers: mod.triggers ?? [],
          deps: mod.deps ?? [],
        })),
      ),
      tokens: await readTokens(),
    }
  },
})
