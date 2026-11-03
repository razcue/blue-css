/**
 * blue-css doctor — render real pages and find elements whose styles were
 * tree-shaken away.
 *
 * The scanner works on build output and can miss markup that only exists at
 * runtime: v-html, CMS or markdown content, `<component :is>`, fully dynamic
 * attributes. The doctor loads pages in a headless browser, reads the live DOM
 * and compares it with the modules the page's stylesheet actually shipped
 * (the `--blue-modules` custom property every Blue build declares).
 *
 * Targets: http(s) URLs, a build directory (served locally, every *.html file
 * is a starting point), or single HTML files.
 */
import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { extname, join, normalize, relative, resolve, sep } from 'node:path'
import { diagnose, findFiles, MODULES_PROPERTY, vocabulary } from '@blue-css/engine'

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.wasm': 'application/wasm',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
}

/** Skip links that obviously aren't pages. */
const NOT_A_PAGE = /\.(?:css|js|mjs|json|xml|txt|pdf|zip|png|jpe?g|gif|webp|avif|svg|ico|woff2?|mp4|webm|mp3)$/i

/**
 * Load Playwright from the project, falling back to wherever Node can find it.
 * It is an optional dependency: only `doctor` needs a browser.
 */
export function loadChromium(cwd = process.cwd()) {
  for (const from of [join(cwd, 'noop.js'), import.meta.url]) {
    const require = createRequire(from)
    for (const name of ['playwright', 'playwright-core']) {
      try {
        return require(name).chromium
      } catch {}
    }
  }
  throw new Error(
    'doctor needs Playwright to render pages. Install it with:\n  npm i -D playwright && npx playwright install chromium',
  )
}

/**
 * Serve a directory over HTTP so absolute asset paths (`/assets/x.css`) work.
 * @param {string} root
 */
export async function serveDirectory(root) {
  const base = resolve(root)
  const server = createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname)
    let file = normalize(join(base, path))
    if (file !== base && !file.startsWith(base + sep)) {
      res.writeHead(403).end()
      return
    }
    const candidates = [file, join(file, 'index.html'), `${file}.html`]
    file = candidates.find((f) => existsSync(f) && statSync(f).isFile())
    if (!file) {
      res.writeHead(404).end('Not found')
      return
    }
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream' })
    createReadStream(file).pipe(res)
  })
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  const { port } = server.address()
  return { origin: `http://127.0.0.1:${port}`, close: () => new Promise((r) => server.close(r)) }
}

/**
 * Runs inside the page: collect every vocabulary token in the live DOM with
 * counts and a few readable element paths, plus the shipped module list.
 */
function collectInPage({ tags, attrs, texts, property }) {
  const tagSet = new Set(tags)
  const attrSet = new Set(attrs)
  const found = {}

  const describe = (el) => {
    const part = (n) => {
      let s = n.localName
      if (n.id) s += `#${n.id}`
      const role = n.getAttribute('role')
      if (role) s += `[role=${role}]`
      return s
    }
    const path = []
    for (let n = el; n && n.nodeType === 1 && path.length < 3; n = n.parentElement) {
      path.unshift(part(n))
      if (n.id || n.localName === 'body') break
    }
    return path.join(' > ')
  }

  const add = (token, el) => {
    const f = (found[token] ??= { count: 0, samples: [] })
    f.count++
    if (f.samples.length < 3) f.samples.push(describe(el))
  }

  for (const el of document.querySelectorAll('*')) {
    // Opted-out subtrees and shadcn components ([data-slot]) are not Blue's job.
    if (el.closest('[data-blue="off"]') || el.hasAttribute('data-slot')) continue
    if (tagSet.has(el.localName)) add(`tag:${el.localName}`, el)
    for (const a of el.attributes) {
      if (!attrSet.has(a.name)) continue
      add(`attr:${a.name}`, el)
      if (a.value) add(`attr:${a.name}=${a.value}`, el)
    }
  }

  // Library markers (text: tokens) live in inline styles, e.g. a CSS variable
  // a component sets on itself.
  for (const text of texts) {
    for (const el of document.querySelectorAll(`[style*="${text}"]`)) {
      if (!el.closest('[data-blue="off"]') && !el.hasAttribute('data-slot')) add(`text:${text}`, el)
    }
  }

  const shipped = getComputedStyle(document.documentElement)
    .getPropertyValue(property)
    .trim()
    .replace(/^["']|["']$/g, '')
  const links = [...document.querySelectorAll('a[href]')].map((a) => a.href)
  return { found, shipped, links, title: document.title }
}

/**
 * Inspect pages and diagnose each one.
 *
 * @param {object} options
 * @param {string[]} options.targets URLs, directories or HTML files
 * @param {import('@blue-css/engine').Manifest[]} options.manifests
 * @param {string} [options.cwd]
 * @param {boolean} [options.crawl] follow same-origin links
 * @param {number} [options.maxPages]
 * @param {number} [options.wait] extra ms to wait after load (client rendering)
 * @param {string} [options.root] directory that absolute paths resolve against
 *   when serving HTML files (default: the file's own directory)
 * @param {(msg: string) => void} [options.onPage]
 */
export async function runDoctor(options) {
  const { manifests, cwd = process.cwd(), crawl = false, maxPages = 50, wait = 0, onPage } = options
  const closers = []
  const queue = []
  const origins = new Set()
  const servers = new Map()
  const serve = async (root) => {
    if (!servers.has(root)) {
      const server = await serveDirectory(root)
      closers.push(server.close)
      origins.add(server.origin)
      servers.set(root, server.origin)
    }
    return servers.get(root)
  }
  const vocab = vocabulary(manifests)

  const seen = new Set()
  const pages = []
  let browser

  try {
    for (const target of options.targets) {
      if (/^https?:\/\//i.test(target)) {
        queue.push(target)
        origins.add(new URL(target).origin)
        continue
      }
      const path = resolve(cwd, target)
      if (!existsSync(path)) throw new Error(`Not a URL, directory or file: ${target}`)
      const isDir = statSync(path).isDirectory()
      const root = isDir ? path : options.root ? resolve(cwd, options.root) : resolve(path, '..')
      if (!isDir && relative(root, path).startsWith('..')) throw new Error(`${target} is outside --root ${options.root}`)
      const origin = await serve(root)
      const htmlFiles = isDir ? await findFiles('**/*.html', { cwd: root }) : [path]
      if (!htmlFiles.length) throw new Error(`No HTML files in ${target}. For SSR apps, start the server and pass its URL.`)
      for (const file of htmlFiles) {
        const rel = relative(root, file).split(sep).join('/')
        queue.push(`${origin}/${rel.replace(/(^|\/)index\.html$/, '$1')}`)
      }
    }

    browser = await loadChromium(cwd).launch()
    const context = await browser.newContext()
    while (queue.length && pages.length < maxPages) {
      const url = normalizeUrl(queue.shift())
      if (seen.has(url)) continue
      seen.add(url)

      const tab = await context.newPage()
      try {
        const response = await tab.goto(url, { waitUntil: 'networkidle' })
        if (wait) await tab.waitForTimeout(wait)
        const data = await tab.evaluate(collectInPage, {
          tags: [...vocab.tags],
          attrs: [...vocab.attrs],
          texts: [...vocab.texts],
          property: MODULES_PROPERTY,
        })
        const shipped = data.shipped ? data.shipped.split(/\s+/) : []
        const page = {
          url,
          title: data.title,
          status: response?.status() ?? 0,
          hasBlue: shipped.length > 0,
          ...diagnose(manifests, data.found, shipped),
        }
        pages.push(page)
        onPage?.(page)

        if (crawl) {
          for (const link of data.links) {
            const next = normalizeUrl(link)
            const { origin, pathname } = new URL(next)
            if (origins.has(origin) && !NOT_A_PAGE.test(pathname) && !seen.has(next)) queue.push(next)
          }
        }
      } catch (error) {
        const page = { url, error: error.message.split('\n')[0] }
        pages.push(page)
        onPage?.(page)
      } finally {
        await tab.close()
      }
    }
  } finally {
    await browser?.close()
    await Promise.all(closers.map((c) => c()))
  }

  return summarize(pages)
}

function normalizeUrl(url) {
  const u = new URL(url)
  u.hash = ''
  if (!u.search) u.search = '' // "/?" and "/" are the same page
  return u.href
}

/** Aggregate per-page diagnoses into one report. */
export function summarize(pages) {
  /** @type {Map<string, { module: string, pages: string[], hits: Map<string, { count: number, samples: string[] }>, via: Set<string> }>} */
  const missing = new Map()
  const unusedEverywhere = new Set(pages.find((p) => p.unused)?.unused ?? [])

  for (const page of pages) {
    if (page.error) continue
    for (const id of [...unusedEverywhere]) if (!page.unused.includes(id)) unusedEverywhere.delete(id)
    for (const req of page.missing) {
      const entry = missing.get(req.module) ?? { module: req.module, pages: [], hits: new Map(), via: new Set() }
      entry.pages.push(page.url)
      for (const v of req.via) entry.via.add(v)
      for (const hit of req.hits) {
        const h = entry.hits.get(hit.token) ?? { count: 0, samples: [] }
        h.count += hit.count
        for (const s of hit.samples) if (h.samples.length < 3 && !h.samples.includes(s)) h.samples.push(s)
        entry.hits.set(hit.token, h)
      }
      missing.set(req.module, entry)
    }
  }

  return {
    pages,
    missing: [...missing.values()].map((m) => ({
      module: m.module,
      pages: m.pages,
      via: [...m.via],
      hits: [...m.hits].map(([token, h]) => ({ token, ...h })),
    })),
    unused: [...unusedEverywhere],
    errors: pages.filter((p) => p.error),
    withoutBlue: pages.filter((p) => !p.error && !p.hasBlue),
    ok: pages.every((p) => !p.error && p.hasBlue && p.missing.length === 0),
  }
}

/** Human-readable report. */
export function formatReport(report, { origin } = {}) {
  const short = (url) => (origin && url.startsWith(origin) ? url.slice(origin.length) || '/' : url)
  const lines = []
  const inspected = report.pages.filter((p) => !p.error).length
  lines.push(`Inspected ${inspected} page(s)`)

  for (const p of report.errors) lines.push(`  ✗ ${p.url}: ${p.error}`)
  for (const p of report.withoutBlue) {
    lines.push(`  ✗ ${p.url}: no Blue stylesheet found (no ${MODULES_PROPERTY} on :root)`)
  }

  if (report.missing.length) {
    // Dependency-only entries ship with the module that needs them: fold them in.
    const missingIds = new Set(report.missing.map((m) => m.module))
    const primary = report.missing.filter((m) => m.hits.length || !m.via.some((v) => missingIds.has(v)))
    const depsOf = (id) => report.missing.filter((m) => !m.hits.length && m.via.includes(id)).map((m) => m.module)

    lines.push('', `Missing modules (${primary.length}): elements on these pages have no Blue styles`)
    for (const m of primary) {
      const where = m.pages.slice(0, 3).map(short).join(', ') + (m.pages.length > 3 ? ` +${m.pages.length - 3} more` : '')
      const deps = depsOf(m.module)
      lines.push(`  ✗ ${m.module}${deps.length ? ` (+ ${deps.join(', ')})` : ''}  on ${where}`)
      if (!m.hits.length) lines.push(`      required by ${m.via.join(', ')}`)
      for (const h of m.hits) {
        lines.push(`      ${h.token} ×${h.count}`)
        for (const s of h.samples) lines.push(`        ${s}`)
      }
    }
    const ids = primary.map((m) => `'${m.module}'`).join(', ')
    lines.push(
      '',
      'This markup only exists at runtime (v-html, CMS/markdown content, dynamic tags),',
      'so the build-time scan could not see it. Ship the modules anyway with:',
      `  safelist: [${ids}]`,
    )
  } else if (inspected && !report.withoutBlue.length) {
    lines.push('  ✓ every element Blue styles had its module shipped')
  }

  if (report.unused.length) {
    lines.push(
      '',
      `Shipped but unused on every inspected page: ${report.unused.join(', ')}`,
      '  (fine if other pages use them; otherwise the scan over-included)',
    )
  }
  return lines.join('\n')
}

