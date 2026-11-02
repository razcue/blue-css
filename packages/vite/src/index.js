/**
 * @blue-css/vite
 *
 *   import blue from '@blue-css/vite'
 *   export default defineConfig({ plugins: [blue()] })
 *
 * Dev: serves the full stylesheet and links it from index.html (no scanning,
 * nothing to miss while you iterate).
 *
 * Build: scans the final, in-memory bundle (every JS chunk, including what
 * libraries in node_modules render) plus the HTML entry points, then emits a
 * content-hashed `blue-[hash].css` and links it from the built HTML.
 *
 * Frameworks without an index.html (SSR) can read the result from
 * `plugin.api` and inject the link themselves.
 */
import { readFile } from 'node:fs/promises'
import { createContext, findFiles, SOURCE_MAP, summary } from '@blue-css/engine'

export const DEV_PATH = '@blue-css/blue.css'

/**
 * @param {import('./index').Options} [options]
 * @returns {import('vite').Plugin[] & { api: import('./index').Api }}
 */
export default function blue(options = {}) {
  const { inject = true, report = true, content = [], ...engineConfig } = options

  /** @type {import('vite').ResolvedConfig} */
  let config
  /** @type {Promise<import('@blue-css/engine').Context> | undefined} */
  let contextPromise
  /** Tokens found in HTML entry points during this build. */
  let htmlTokens = new Set()
  /** @type {Promise<string> | undefined} */
  let fullCss

  /** @type {import('./index').Api} */
  const api = {
    result: undefined,
    fileName: undefined,
    get href() {
      return api.fileName && config ? joinBase(config.base, api.fileName) : undefined
    },
  }

  const context = () => (contextPromise ??= createContext({ ...engineConfig, cwd: config?.root }))
  const linkTag = (href) => ({ tag: 'link', attrs: { rel: 'stylesheet', href }, injectTo: 'head-prepend' })

  /** Collects tokens from HTML entry points before Vite rewrites them. */
  const scanHtml = {
    name: 'blue-css:scan-html',
    apply: 'build',
    transformIndexHtml: {
      order: 'pre',
      async handler(html) {
        ;(await context()).scanner.scan(html, htmlTokens)
      },
    },
  }

  /** @type {import('vite').Plugin} */
  const main = {
    name: 'blue-css',

    configResolved(resolved) {
      config = resolved
    },

    buildStart() {
      htmlTokens = new Set()
      api.result = undefined
      api.fileName = undefined
    },

    configureServer(server) {
      const url = joinBase(config.base, DEV_PATH)
      server.middlewares.use(async (req, res, next) => {
        const path = req.url?.split('?')[0]
        if (path !== url && path !== `/${DEV_PATH}`) return next()
        try {
          fullCss ??= context().then((ctx) => ctx.build('all')).then((r) => r.css)
          res.setHeader('Content-Type', 'text/css; charset=utf-8')
          res.setHeader('Cache-Control', 'no-cache')
          res.end(await fullCss)
        } catch (error) {
          next(error)
        }
      })
    },

    async generateBundle(_outputOptions, bundle) {
      // SSR bundles are scanned by the framework integration, not emitted here.
      if (config.build.ssr) return

      const ctx = await context()
      const tokens = new Set(htmlTokens)
      for (const file of Object.values(bundle)) {
        if (file.type === 'chunk') ctx.scanner.scan(file.code, tokens)
        else if (typeof file.source === 'string' && /\.(?:html?|json|js|mjs)$/.test(file.fileName) && !SOURCE_MAP.test(file.fileName)) {
          ctx.scanner.scan(file.source, tokens)
        }
      }
      if (content.length) {
        const files = await findFiles(content, { cwd: config.root })
        for (const f of files) ctx.scanner.scan(await readFile(f, 'utf8'), tokens)
      }

      const result = await ctx.build(tokens)
      const ref = this.emitFile({ type: 'asset', name: 'blue.css', source: result.css })
      api.result = result
      api.fileName = this.getFileName(ref)
      if (report) config.logger.info(`\x1b[34mblue-css\x1b[0m ${api.fileName}: ${summary(result)}`)
    },

    transformIndexHtml: {
      order: 'post',
      handler() {
        if (!inject) return
        if (config.command === 'serve') return [linkTag(joinBase(config.base, DEV_PATH))]
        if (api.href) return [linkTag(api.href)]
      },
    },
  }

  const plugins = [scanHtml, main]
  return Object.assign(plugins, { api })
}

/** Join Vite's `base` and a path, keeping relative bases (`./`) relative. */
function joinBase(base, path) {
  if (!base || base === '/') return `/${path}`
  return base.endsWith('/') ? base + path : `${base}/${path}`
}
