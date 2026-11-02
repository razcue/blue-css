import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'
import { transform } from 'lightningcss'

export const SCOPE = '@scope (:root) to ([data-blue="off"])'

/**
 * Ordered, de-duplicated list of `blue.*` sub-layers across manifests.
 * @param {import('./types').Manifest[]} manifests
 */
export function layerOrder(manifests) {
  const order = []
  for (const m of manifests) for (const l of m.layers ?? []) if (!order.includes(l)) order.push(l)
  return order
}

/**
 * Concatenate and wrap modules into a stylesheet.
 *
 * @param {import('./types').Manifest[]} manifests
 * @param {import('./types').ResolvedModule[]} modules
 * @param {{ minify?: boolean, banner?: string, filename?: string }} [options]
 * @returns {Promise<{ css: string, bytes: number, gzip: number }>}
 */
export async function build(manifests, modules, options = {}) {
  const { minify = true, banner, filename = 'blue.css' } = options
  const layers = layerOrder(manifests)

  for (const mod of modules) {
    if (!layers.includes(mod.layer)) {
      throw new Error(`Module "${mod.id}" uses undeclared layer "${mod.layer}". Declared: ${layers.join(', ')}.`)
    }
  }

  const parts = []

  for (const mod of modules) {
    const source = await readFile(join(mod.manifest.dir, mod.file), 'utf8')
    const body = mod.scoped ? `${SCOPE} {\n${source}\n}` : source
    parts.push(`/* ${mod.manifest.name} :: ${mod.id} */\n@layer blue.${mod.layer} {\n${body}\n}`)
  }

  let css = parts.join('\n\n') + '\n'

  // Always run through lightningcss: it validates the output (errors on
  // invalid CSS) and minifies when asked. No `targets`, so modern syntax
  // (nesting, light-dark(), @scope) is kept as written.
  const result = transform({
    filename,
    code: Buffer.from(css),
    minify,
    errorRecovery: false,
  })
  css = result.code.toString()

  // Declare the full sub-layer order up front (added after lightningcss,
  // which would otherwise fold the statement into the blocks that follow).
  const statement = `@layer ${layers.map((l) => `blue.${l}`).join(minify ? ',' : ', ')};`
  css = statement + (minify ? '' : '\n\n') + css

  if (banner) css = `/*! ${banner} */\n` + css

  return { css, bytes: Buffer.byteLength(css), gzip: gzipSync(css).length }
}
