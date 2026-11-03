#!/usr/bin/env node
// After `nuxt generate` for GitHub Pages: adds the base path (/blue-css/) to the
// absolute same-origin URLs Docus writes without it (llms.txt, llms-full.txt,
// sitemap.md, canonical links) and to its hard-coded favicon link. Docus 5
// doesn't support a base path there yet. Adapted from razcue/agent-kit.
//
//   node scripts/site-base.mjs <output dir> [--origin https://razcue.github.io] [--base /blue-css/]
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { pathToFileURL } from 'node:url'

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** One file's text with the base path added where Docus left it out. Idempotent. */
export function rewrite(file, text, origin, base) {
  if (base === '/' || !/\.(txt|md|html)$/.test(file)) return text
  const b = base.replace(/^\/?/, '/').replace(/\/?$/, '/')
  // Nothing lives at the origin root on a project site: every same-origin URL needs the base.
  let next = text.replace(new RegExp(`${esc(origin)}/(?!${esc(b.slice(1))})`, 'g'), `${origin}${b}`)
  if (file.endsWith('.html')) next = next.replaceAll('href="/favicon.ico"', `href="${b}favicon.ico"`)
  return next
}

const walk = (dir) => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]))

export function fixBasePath(outDir, origin, base) {
  const changed = []
  for (const path of walk(outDir).filter((p) => /\.(txt|md|html)$/.test(p))) {
    const text = readFileSync(path, 'utf8')
    const next = rewrite(path, text, origin, base)
    if (next !== text) {
      writeFileSync(path, next)
      changed.push(relative(outDir, path))
    }
  }
  return changed
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const [dir, ...rest] = process.argv.slice(2)
  const opt = (k, d) => (rest.includes(k) ? rest[rest.indexOf(k) + 1] : d)
  if (!dir) {
    console.error('usage: site-base.mjs <output dir> [--origin <url>] [--base /blue-css/]')
    process.exit(2)
  }
  const changed = fixBasePath(dir, opt('--origin', process.env.NUXT_SITE_URL || 'https://razcue.github.io'), opt('--base', process.env.NUXT_APP_BASE_URL || '/'))
  console.log(`site-base: ${changed.length} file(s) rewritten`)
}
