/** `tag:<name>`, `attr:<name>`, `attr:<name>=<value>` or `text:<literal>` */
export type Token = string

export interface ModuleDefinition {
  /** Unique across all manifests; also usable in `safelist`. */
  id: string
  /** Path relative to the manifest's `dir`. */
  file: string
  /** A sub-layer of `blue`, declared in some manifest's `layers`. */
  layer: string
  /** Always shipped, regardless of the scan. */
  always?: boolean
  /** Wrap in `@scope (:root) to ([data-blue="off"])`. Default `true`. */
  scoped?: boolean
  /** Tokens that pull this module in. */
  triggers?: Token[]
  /** Modules that must ship alongside this one. */
  deps?: string[]
}

export interface Manifest {
  name: string
  /** Absolute directory the module files live in. */
  dir: string
  /** Sub-layers of `blue`, lowest priority first. */
  layers?: string[]
  modules: ModuleDefinition[]
}

export interface ResolvedModule extends ModuleDefinition {
  scoped: boolean
  manifest: Manifest
  order: number
  layers: string[]
}

export interface Config {
  /** Globs or directories of your *built* output (HTML, JS chunks, JSON payloads). */
  content?: string | string[]
  /** Extra ignore globs. */
  ignore?: string[]
  /** Output file. */
  out?: string
  /** Module ids or tokens that always ship (for runtime/CMS content). */
  safelist?: string[]
  /** Additional manifests, as objects or package names. */
  presets?: Array<Manifest | string>
  /** Ship Blue's reset (disable when Tailwind preflight is present). Default `true`. */
  reset?: boolean
  /** Minify the output. Default `true`. */
  minify?: boolean
  /** Comment placed at the top of the output. */
  banner?: string
}

export interface BuildResult {
  css: string
  bytes: number
  gzip: number
  files: string[]
  tokens: Set<Token>
  included: Array<{ id: string; reason: string }>
  excluded: string[]
}

export interface Context {
  manifests: Manifest[]
  scanner: ReturnType<typeof createScanner>
  build(tokens: Set<Token> | 'all'): Promise<BuildResult>
}

export interface Requirement {
  module: string
  /** Tokens in the DOM that trigger this module, with element counts and sample paths. */
  hits: Array<{ token: Token; count: number; samples: string[] }>
  /** Modules that need this one as a dependency (when it has no hits of its own). */
  via: string[]
}

export interface Diagnosis {
  shipped: string[]
  required: string[]
  missing: Requirement[]
  /** Optional modules shipped but not needed by the inspected DOM. */
  unused: string[]
  /** Shipped ids no manifest knows (preset missing from the config?). */
  unknown: string[]
}

export const MODULES_PROPERTY: string
export function diagnose(
  manifests: Manifest[],
  found: Record<Token, { count: number; samples: string[] }>,
  shipped: string[],
): Diagnosis

export function createContext(config?: Config & { cwd?: string }): Promise<Context>
export function contentHash(css: string): string
export function summary(result: BuildResult): string
export function defineConfig(config: Config): Config
export function loadConfig(options?: { cwd?: string; file?: string }): Promise<Config & { configFile?: string }>
export function loadManifests(presets?: Array<Manifest | string>, cwd?: string): Promise<Manifest[]>
export function buildCss(config?: Config & { cwd?: string; full?: boolean }): Promise<BuildResult>
export function createScanner(manifests: Manifest[]): {
  scan(text: string, into?: Set<Token>): Set<Token>
  tags: Set<string>
  attrs: Set<string>
  texts: Set<string>
}
export function resolve(
  manifests: Manifest[],
  tokens: Iterable<Token> | 'all',
  options?: { safelist?: string[]; reset?: boolean },
): { modules: ResolvedModule[]; reasons: Map<string, string> }
export function build(
  manifests: Manifest[],
  modules: ResolvedModule[],
  options?: { minify?: boolean; banner?: string; filename?: string },
): Promise<{ css: string; bytes: number; gzip: number }>
export const core: Manifest
