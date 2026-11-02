// Build the complete stylesheet into packages/core/dist (readable + minified).
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { buildCss } from '@blue-css/engine'

const dist = new URL('../packages/core/dist/', import.meta.url)
const { version } = JSON.parse(await readFile(new URL('../packages/core/package.json', import.meta.url), 'utf8'))
const banner = `Blue CSS v${version} | MIT | full build`

await mkdir(dist, { recursive: true })
for (const [file, minify] of [['blue.css', false], ['blue.min.css', true]]) {
  const { css, bytes, gzip } = await buildCss({ full: true, minify, banner })
  await writeFile(new URL(file, dist), css)
  console.log(`${file.padEnd(14)} ${(bytes / 1024).toFixed(1)} kB  (${(gzip / 1024).toFixed(1)} kB gzip)`)
}
