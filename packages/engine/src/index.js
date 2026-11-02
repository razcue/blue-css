import { existsSync } from 'node:fs'
import { join, resolve as resolvePath } from 'node:path'
import { pathToFileURL } from 'node:url'
import core from '@blue-css/core'
import { build } from './build.js'
import { findFiles, scanFiles } from './files.js'
import { resolve } from './resolve.js'
import { createScanner } from './scanner.js'

export { build, layerOrder, SCOPE } from './build.js'
export { findFiles, scanFiles, SCANNABLE } from './files.js'
export { indexModules, resolve } from './resolve.js'
export { createScanner, parseToken, vocabulary } from './scanner.js'
export { core }

export const CONFIG_FILES = ['blue.config.js', 'blue.config.mjs']

/**
 * Identity helper for typed config files.
 * @param {import('./types').Config} config
 */
export const defineConfig = (config) => config

/**
 * Load `blue.config.{js,mjs}` from `cwd`, or a given path.
 * @param {{ cwd?: string, file?: string }} [options]
 * @returns {Promise<import('./types').Config & { configFile?: string }>}
 */
export async function loadConfig(options = {}) {
  const cwd = options.cwd ?? process.cwd()
  const file = options.file
    ? resolvePath(cwd, options.file)
    : CONFIG_FILES.map((f) => join(cwd, f)).find((f) => existsSync(f))
  if (!file) return {}
  if (!existsSync(file)) throw new Error(`Config file not found: ${file}`)
  const mod = await import(pathToFileURL(file).href)
  return { ...(mod.default ?? mod), configFile: file }
}

/**
 * Turn `presets` (manifest objects or package names) into manifests, core first.
 * @param {Array<import('./types').Manifest | string>} [presets]
 * @param {string} [cwd]
 */
export async function loadManifests(presets = [], cwd = process.cwd()) {
  const manifests = [core]
  for (const preset of presets) {
    if (typeof preset === 'string') {
      const { createRequire } = await import('node:module')
      const require = createRequire(join(cwd, 'noop.js'))
      const mod = await import(pathToFileURL(require.resolve(preset)).href)
      manifests.push(mod.default ?? mod)
    } else {
      manifests.push(preset)
    }
  }
  return manifests
}

/**
 * Scan `content`, resolve modules and build the stylesheet.
 *
 * @param {import('./types').Config & { cwd?: string, full?: boolean }} config
 * @returns {Promise<import('./types').BuildResult>}
 */
export async function buildCss(config = {}) {
  const cwd = config.cwd ?? process.cwd()
  const manifests = await loadManifests(config.presets, cwd)

  let files = []
  let tokens = 'all'
  if (!config.full) {
    if (!config.content || (Array.isArray(config.content) && config.content.length === 0)) {
      throw new Error('No `content` to scan. Pass globs/directories of your built output, or build the full stylesheet.')
    }
    files = await findFiles(config.content, { cwd, ignore: config.ignore })
    if (files.length === 0) {
      throw new Error(`No files matched ${JSON.stringify(config.content)} in ${cwd}. Did the framework build run first?`)
    }
    tokens = await scanFiles(files, createScanner(manifests))
  }

  const { modules, reasons } = resolve(manifests, tokens, {
    safelist: config.safelist,
    reset: config.reset ?? true,
  })
  const result = await build(manifests, modules, {
    minify: config.minify ?? true,
    banner: config.banner,
  })

  const allIds = manifests.flatMap((m) => m.modules.map((mod) => mod.id))
  return {
    ...result,
    files,
    tokens: tokens === 'all' ? new Set() : tokens,
    included: modules.map((m) => ({ id: m.id, reason: reasons.get(m.id) })),
    excluded: allIds.filter((id) => !reasons.has(id)),
  }
}
