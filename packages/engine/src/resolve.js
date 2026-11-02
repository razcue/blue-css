import { parseToken } from './scanner.js'

/**
 * Validate manifests and index their modules by id.
 * @param {import('./types').Manifest[]} manifests
 * @returns {Map<string, import('./types').ResolvedModule>}
 */
export function indexModules(manifests) {
  const index = new Map()
  for (const manifest of manifests) {
    const layers = manifest.layers ?? []
    for (const mod of manifest.modules) {
      if (index.has(mod.id)) {
        throw new Error(`Duplicate module id "${mod.id}" in ${manifest.name} (already defined by ${index.get(mod.id).manifest.name}).`)
      }
      for (const token of mod.triggers ?? []) parseToken(token)
      index.set(mod.id, { ...mod, scoped: mod.scoped ?? true, manifest, order: index.size, layers })
    }
  }
  for (const mod of index.values()) {
    for (const dep of mod.deps ?? []) {
      if (!index.has(dep)) throw new Error(`Module "${mod.id}" depends on unknown module "${dep}".`)
    }
  }
  return index
}

/**
 * Decide which modules ship.
 *
 * @param {import('./types').Manifest[]} manifests
 * @param {Iterable<string> | 'all'} tokens  tokens found by the scanner, or 'all'
 * @param {{ safelist?: string[], reset?: boolean }} [options]
 *   safelist: module ids or tokens that must ship regardless of the scan
 * @returns {{ modules: import('./types').ResolvedModule[], reasons: Map<string, string> }}
 */
export function resolve(manifests, tokens, options = {}) {
  const { safelist = [], reset = true } = options
  const index = indexModules(manifests)
  const all = tokens === 'all'
  const found = all ? new Set() : new Set(tokens)
  const safeIds = new Set()

  for (const entry of safelist) {
    if (index.has(entry)) safeIds.add(entry)
    else {
      parseToken(entry) // throws with a helpful message on typos
      found.add(entry)
    }
  }

  /** @type {Map<string, string>} module id → why it ships */
  const reasons = new Map()
  const include = (id, reason) => {
    if (reasons.has(id)) return
    if (id === 'reset' && !reset) return
    reasons.set(id, reason)
    for (const dep of index.get(id).deps ?? []) include(dep, `dependency of ${id}`)
  }

  for (const mod of index.values()) {
    if (all) include(mod.id, 'full build')
    else if (mod.always) include(mod.id, 'always')
    else if (safeIds.has(mod.id)) include(mod.id, 'safelist')
    else {
      const hit = (mod.triggers ?? []).find((t) => found.has(t))
      if (hit) include(mod.id, hit)
    }
  }

  const modules = [...index.values()].filter((m) => reasons.has(m.id)).sort((a, b) => a.order - b.order)
  return { modules, reasons }
}
