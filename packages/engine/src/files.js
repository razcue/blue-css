import { readFile } from 'node:fs/promises'
import { resolve as resolvePath } from 'node:path'
import { glob } from 'tinyglobby'

/** Extensions worth scanning. CSS (including Blue's own output) and source maps never are. */
export const SCANNABLE = /\.(?:html?|[cm]?js|jsx|tsx?|vue|svelte|astro|mdx?|json|txt|xml|php|twig|njk|liquid|hbs|erb)$/i

/**
 * Expand globs (a bare directory becomes `dir/**`) into scannable files.
 * @param {string | string[]} content
 * @param {{ cwd?: string, ignore?: string[] }} [options]
 */
export async function findFiles(content, options = {}) {
  const cwd = options.cwd ?? process.cwd()
  const patterns = (Array.isArray(content) ? content : [content]).map((p) =>
    /[*?{}[\]]/.test(p) || SCANNABLE.test(p) ? p : `${p.replace(/\/$/, '')}/**/*`,
  )
  const files = await glob(patterns, {
    cwd,
    absolute: true,
    dot: false,
    ignore: ['**/node_modules/**', '**/.git/**', ...(options.ignore ?? [])],
  })
  return files.filter((f) => SCANNABLE.test(f)).sort()
}

/**
 * Scan files with a scanner and collect tokens.
 * @param {string[]} files absolute paths
 * @param {{ scan: (text: string, into?: Set<string>) => Set<string> }} scanner
 */
export async function scanFiles(files, scanner) {
  const tokens = new Set()
  await Promise.all(
    files.map(async (file) => {
      const text = await readFile(resolvePath(file), 'utf8')
      scanner.scan(text, tokens)
    }),
  )
  return tokens
}
