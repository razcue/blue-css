/**
 * @blue-css/nuxt
 *
 *   export default defineNuxtConfig({ modules: ['@blue-css/nuxt'], blue: { … } })
 *
 * Dev: adds the full stylesheet to the app's CSS (no scanning).
 *
 * Build: once Vite has produced both bundles, the module builds the
 * tree-shaken stylesheet from
 *   - every emitted client chunk (app code and the libraries it renders, e.g. reka-ui);
 *   - the app's own modules in the server build (server components and islands
 *     never reach the client). Server-side node_modules are skipped: the
 *     unminified Vue runtime is full of messages like "v-model on <input>";
 *   - optional extra `content` globs.
 * It writes `<buildAssetsDir>/blue.<hash>.css`, and a Nitro plugin links it
 * from every rendered page: SSR, prerendered, and the SPA shell.
 *
 * Build order in Nuxt 4: vite (client, server) → nitro:build:before → prepare
 * (cleans .output) → prerender → nitro build (rollup:before copies public
 * assets → nitro:build:public-assets). The CSS is computed at
 * nitro:build:before so prerendered HTML already links it, and written at
 * nitro:build:public-assets so `prepare` cannot wipe it.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { addServerPlugin, addVitePlugin, defineNuxtModule, useLogger } from '@nuxt/kit'
import { buildCss, contentHash, createContext, findFiles, summary } from '@blue-css/engine'

const VIRTUAL = '#blue-css/stylesheet'

export default defineNuxtModule({
  meta: {
    name: '@blue-css/nuxt',
    configKey: 'blue',
    compatibility: { nuxt: '>=3.10.0' },
  },
  defaults: {
    safelist: [],
    presets: [],
    content: [],
    reset: true,
    minify: true,
    report: true,
  },
  async setup(options, nuxt) {
    const logger = useLogger('blue-css')
    const engineConfig = {
      safelist: options.safelist,
      presets: options.presets,
      reset: options.reset,
      minify: options.minify,
      cwd: nuxt.options.rootDir,
    }

    if (nuxt.options.dev) {
      // A real file so Vite serves it through its normal CSS pipeline.
      const file = join(nuxt.options.buildDir, 'blue-css', 'blue.css')
      const { css } = await buildCss({ ...engineConfig, full: true, minify: false })
      await mkdir(join(nuxt.options.buildDir, 'blue-css'), { recursive: true })
      await writeFile(file, css)
      nuxt.options.css.unshift(file)
      return
    }

    /** @type {{ fileName?: string, css?: string }} */
    const state = {}
    const context = createContext(engineConfig)
    const serverTokens = new Set()

    // Scan the app's own modules as the server build transforms them.
    addVitePlugin(
      {
        name: 'blue-css:scan-server',
        apply: 'build',
        enforce: 'post',
        async transform(code, id) {
          if (id.startsWith('\0') || id.includes('/node_modules/')) return
          ;(await context).scanner.scan(code, serverTokens)
        },
      },
      { client: false, server: true },
    )

    nuxt.hook('nitro:config', (config) => {
      config.virtual ??= {}
      // Evaluated lazily by Nitro's bundler, after the CSS has been computed.
      config.virtual[VIRTUAL] = () => `export const fileName = ${JSON.stringify(state.fileName ?? '')}`
    })
    addServerPlugin(fileURLToPath(new URL('./runtime/server-plugin.js', import.meta.url)))

    nuxt.hook('nitro:build:before', async () => {
      const ctx = await context
      const tokens = new Set(serverTokens)
      // The client dist lives under node_modules/.cache in Nuxt 4: glob it from
      // inside so the default node_modules ignore cannot apply.
      const files = [
        ...(await findFiles('**/*', { cwd: join(nuxt.options.buildDir, 'dist', 'client') })),
        ...(options.content.length ? await findFiles(options.content, { cwd: nuxt.options.rootDir }) : []),
      ]
      for (const file of files) ctx.scanner.scan(await readFile(file, 'utf8'), tokens)

      const result = await ctx.build(tokens)
      state.css = result.css
      state.fileName = `blue.${contentHash(result.css)}.css`
      if (options.report) logger.info(`${state.fileName}: ${summary(result)} (scanned ${files.length} files + server app modules)`)
    })

    nuxt.hook('nitro:build:public-assets', async (nitro) => {
      if (!state.css) return
      const dir = join(nitro.options.output.publicDir, nuxt.options.app.buildAssetsDir)
      await mkdir(dir, { recursive: true })
      await writeFile(join(dir, state.fileName), state.css)
    })
  },
})
