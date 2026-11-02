import type { Plugin } from 'vite'
import type { BuildResult, Config } from '@blue-css/engine'

export interface Options extends Omit<Config, 'content' | 'out'> {
  /** Link the stylesheet from index.html (dev and build). Default `true`. */
  inject?: boolean
  /** Log a one-line size summary after the build. Default `true`. */
  report?: boolean
  /**
   * Extra files to scan on top of the bundle, relative to Vite's root
   * (e.g. markdown rendered at runtime).
   */
  content?: string[]
}

export interface Api {
  /** Build result of the last client build. */
  result: BuildResult | undefined
  /** Emitted file name relative to the output directory, e.g. `assets/blue-AbC123.css`. */
  fileName: string | undefined
  /** Public URL of the emitted stylesheet (Vite `base` + `fileName`). */
  readonly href: string | undefined
}

export const DEV_PATH: string

export default function blue(options?: Options): Plugin[] & { api: Api }
