import type { NuxtModule } from '@nuxt/schema'
import type { Config } from '@blue-css/engine'

export interface ModuleOptions extends Pick<Config, 'safelist' | 'presets' | 'reset' | 'minify'> {
  /**
   * Extra files to scan on top of the client and server bundles, relative to
   * the project root (e.g. `content/**\/*.md` for runtime-rendered markdown).
   */
  content?: string[]
  /** Log a one-line size summary after the build. Default `true`. */
  report?: boolean
}

declare const module: NuxtModule<ModuleOptions>
export default module

declare module '@nuxt/schema' {
  interface NuxtConfig {
    blue?: ModuleOptions
  }
  interface NuxtOptions {
    blue?: ModuleOptions
  }
}
