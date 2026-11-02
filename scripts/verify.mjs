// Visual verification of tree-shaking.
//
// For every example page: build a stylesheet shaken against that page alone,
// then screenshot the page with the full CSS and with the shaken CSS, in light
// and dark mode. The screenshots must be pixel-identical: anything else means
// the scanner missed a module the page needs.
//
// Screenshots are written to .verify/ for review. Requires Playwright.
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { buildCss } from '@blue-css/engine'

const require = createRequire(import.meta.url)
let chromium
try {
  ;({ chromium } = require('playwright'))
} catch {
  console.error('verify: Playwright is not installed (npm i -D playwright).')
  process.exit(1)
}

const root = new URL('../', import.meta.url)
const examples = new URL('examples/', root)
const out = new URL('.verify/', root)
await mkdir(out, { recursive: true })

const fullCss = await readFile(new URL('packages/core/dist/blue.css', root), 'utf8')
const pages = (await readdir(examples)).filter((f) => f.endsWith('.html')).sort()
const browser = await chromium.launch()
let failures = 0

for (const page of pages) {
  const file = fileURLToPath(new URL(page, examples))
  const shaken = await buildCss({ content: [file], minify: false })
  const name = page.replace(/\.html$/, '')
  await writeFile(new URL(`${name}.shaken.css`, out), shaken.css)

  for (const colorScheme of ['light', 'dark']) {
    const shots = {}
    for (const [variant, css] of [['full', fullCss], ['shaken', shaken.css]]) {
      const context = await browser.newContext({ colorScheme, viewport: { width: 1280, height: 900 } })
      const tab = await context.newPage()
      await tab.route('**/blue.css', (route) => route.fulfill({ contentType: 'text/css', body: css }))
      await tab.goto(new URL(page, examples).href)
      shots[variant] = await tab.screenshot({ fullPage: true, animations: 'disabled' })
      await writeFile(new URL(`${name}.${colorScheme}.${variant}.png`, out), shots[variant])
      await context.close()
    }
    const same = shots.full.equals(shots.shaken)
    if (!same) failures++
    console.log(
      `${same ? '✓' : '✗'} ${page.padEnd(18)} ${colorScheme.padEnd(5)}  ` +
        `${shaken.included.length} modules, ${(shaken.gzip / 1024).toFixed(1)} kB gzip` +
        (same ? '' : '  → screenshots differ, see .verify/'),
    )
  }
}

await browser.close()
if (failures) {
  console.error(`\nverify: ${failures} mismatch(es) between full and shaken CSS.`)
  process.exit(1)
}
