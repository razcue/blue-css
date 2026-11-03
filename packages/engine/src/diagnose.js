import { indexModules } from './resolve.js'

/**
 * Compare what a rendered page contains with what its stylesheet shipped.
 *
 * @param {import('./types').Manifest[]} manifests
 * @param {Record<string, { count: number, samples: string[] }>} found
 *   tokens observed in the live DOM, with element counts and sample paths
 * @param {string[]} shipped module ids the page's stylesheet declares (--blue-modules)
 * @returns {import('./types').Diagnosis}
 */
export function diagnose(manifests, found, shipped) {
  const index = indexModules(manifests)
  const shippedSet = new Set(shipped)

  /** @type {Map<string, import('./types').Requirement>} */
  const required = new Map()

  for (const mod of index.values()) {
    if (mod.always) continue
    const hits = (mod.triggers ?? [])
      .filter((t) => found[t])
      .map((token) => ({ token, count: found[token].count, samples: found[token].samples }))
    if (hits.length) required.set(mod.id, { module: mod.id, hits, via: [] })
  }

  // Dependencies of required modules are required too.
  const queue = [...required.keys()]
  while (queue.length) {
    const id = queue.shift()
    for (const dep of index.get(id).deps ?? []) {
      if (!required.has(dep)) {
        required.set(dep, { module: dep, hits: [], via: [id] })
        queue.push(dep)
      } else if (!required.get(dep).hits.length && !required.get(dep).via.includes(id)) {
        required.get(dep).via.push(id)
      }
    }
  }

  const order = (a, b) => index.get(a.module).order - index.get(b.module).order
  const all = [...required.values()].sort(order)
  const optional = [...index.values()].filter((m) => !m.always).map((m) => m.id)

  return {
    shipped: [...shippedSet],
    required: all.map((r) => r.module),
    missing: all.filter((r) => !shippedSet.has(r.module)),
    unused: optional.filter((id) => shippedSet.has(id) && !required.has(id)),
    unknown: [...shippedSet].filter((id) => !index.has(id)),
  }
}
