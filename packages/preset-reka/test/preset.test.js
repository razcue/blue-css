import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { build as viteBuild } from 'vite'
import { buildCss, core } from '@blue-css/engine'
import blue from '@blue-css/vite'
import { loadChromium, runDoctor, serveDirectory } from '../../cli/src/doctor.js'
import reka from '../manifest.js'

const here = (p) => fileURLToPath(new URL(p, import.meta.url))
const tmp = await mkdtemp(join(tmpdir(), 'blue-reka-'))
after(() => rm(tmp, { recursive: true, force: true }))

let hasBrowser = true
try {
  loadChromium()
} catch {
  hasBrowser = false
}

async function buildApp(root, name) {
  const outDir = join(tmp, name)
  const plugin = blue({ presets: [reka], report: false })
  await viteBuild({ root, configFile: false, logLevel: 'silent', plugins: [vue(), plugin], build: { outDir, emptyOutDir: true } })
  return { outDir, ids: plugin.api.result.included.map((m) => m.id) }
}

describe('manifest', () => {
  it('declares namespaced modules whose files exist', () => {
    for (const mod of reka.modules) {
      assert.match(mod.id, /^reka\//)
      assert.ok(existsSync(join(reka.dir, mod.file)), mod.file)
    }
  })

  it('builds with core into valid CSS, in the presets layer', async () => {
    const { css, included } = await buildCss({ full: true, presets: [reka], minify: false })
    assert.equal(included.length, core.modules.length + reka.modules.length)
    assert.match(css, /@layer blue\.presets \{/)
  })
})

describe('tree-shaking reka-ui apps', { timeout: 120_000 }, () => {
  it('ships only what the imported components render', async () => {
    const { ids } = await buildApp(here('./fixtures/select-only/'), 'select-only')
    for (const id of ['reka/select', 'reka/popper', 'reka/motion', 'forms', 'menu']) assert.ok(ids.includes(id), `ships ${id}`)
    for (const id of ['reka/accordion', 'reka/collapsible', 'reka/dialog', 'reka/toast', 'reka/slider', 'reka/combobox', 'tabs', 'dialog']) {
      assert.ok(!ids.includes(id), `shakes ${id}`)
    }
  })
})

describe('playground', { timeout: 300_000, skip: !hasBrowser && 'Playwright is not installed' }, () => {
  let outDir
  let server
  let browser

  before(async () => {
    ;({ outDir } = await buildApp(here('../playground/'), 'playground'))
    server = await serveDirectory(outDir)
    browser = await loadChromium().launch()
  })
  after(async () => {
    await browser?.close()
    await server?.close()
  })

  it('doctor: every element reka renders had its module shipped', async () => {
    const report = await runDoctor({ targets: [outDir], manifests: [core, reka], crawl: true })
    // The home page plus one page per demo.
    assert.equal(report.pages.length, 16, report.pages.map((p) => p.url).join('\n'))
    assert.deepEqual(report.missing, [])
    assert.ok(report.ok)
  })

  /** Open a demo and read computed styles. */
  async function styles(demo, probes) {
    const page = await browser.newPage({ viewport: { width: 1000, height: 700 } })
    try {
      await page.goto(`${server.origin}/?c=${demo}`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(300)
      return await page.evaluate((probes) => {
        const out = {}
        for (const [key, [selector, prop]] of Object.entries(probes)) {
          const el = document.querySelector(selector)
          out[key] = el ? getComputedStyle(el)[prop] : null
        }
        return out
      }, probes)
    } finally {
      await page.close()
    }
  }

  const transparent = 'rgba(0, 0, 0, 0)'

  it('accordion triggers lose core button styling', async () => {
    const s = await styles('accordion', {
      bg: ['h3 > button[aria-expanded]', 'backgroundColor'],
      justify: ['h3 > button[aria-expanded]', 'justifyContent'],
      overflow: ['[role="region"][data-state="open"]', 'overflow'],
    })
    assert.equal(s.bg, transparent)
    assert.equal(s.justify, 'space-between')
    assert.equal(s.overflow, 'hidden')
  })

  it('dialogs are centered over an overlay', async () => {
    const s = await styles('dialog', {
      position: ['[role="dialog"]', 'position'],
      z: ['[role="dialog"]', 'zIndex'],
      overlay: ['body > div[data-state]:not([role])', 'position'],
      overlayBg: ['body > div[data-state]:not([role])', 'backgroundColor'],
      close: ['[role="dialog"] > button', 'position'],
    })
    assert.equal(s.position, 'fixed')
    assert.equal(s.z, '50')
    assert.equal(s.overlay, 'fixed')
    assert.notEqual(s.overlayBg, transparent)
    assert.equal(s.close, 'absolute')
  })

  it('floating content is layered and panel-styled', async () => {
    const pop = await styles('popover', {
      wrapperZ: ['[data-reka-popper-content-wrapper]', 'zIndex'],
      width: ['[data-reka-popper-content-wrapper] > [role="dialog"]', 'width'],
      position: ['[data-reka-popper-content-wrapper] > [role="dialog"]', 'position'],
    })
    assert.equal(pop.wrapperZ, '50', 'reka copies the content z-index onto its wrapper')
    assert.equal(pop.width, '288px')
    assert.notEqual(pop.position, 'fixed', 'popovers are not centered like modals')

    const tip = await styles('tooltip', { bg: ['[data-reka-popper-content-wrapper] > div', 'backgroundColor'] })
    assert.notEqual(tip.bg, transparent)
  })

  it('select trigger looks like a field and the list is at least as wide', async () => {
    const page = await browser.newPage()
    try {
      await page.goto(`${server.origin}/?c=select`, { waitUntil: 'networkidle' })
      const { trigger, list, border } = await page.evaluate(() => ({
        trigger: document.querySelector('button[role="combobox"]').getBoundingClientRect().width,
        list: document.querySelector('[role="listbox"]').getBoundingClientRect().width,
        border: getComputedStyle(document.querySelector('button[role="combobox"]')).borderTopWidth,
      }))
      assert.equal(border, '1px')
      assert.ok(list >= trigger, `list ${list} >= trigger ${trigger}`)
    } finally {
      await page.close()
    }
  })

  it('in-flow parts: slider, avatar, toggles, toolbar, toast', async () => {
    const s = await styles('controls', { track: ['[data-slider-impl] > span:not([role])', 'height'] })
    assert.equal(s.track, '6px')

    const d = await styles('display', {
      avatar: ['span[role="img"]', 'width'],
      radius: ['span[role="img"]', 'borderTopLeftRadius'],
      separator: ['[role="separator"]', 'height'],
    })
    assert.equal(d.avatar, '32px')
    assert.equal(d.radius, '999px')
    assert.equal(d.separator, '1px')

    const t = await styles('toggles', {
      pressed: ['button[aria-pressed="true"]', 'backgroundColor'],
      unpressed: ['button[aria-pressed="false"]', 'backgroundColor'],
      toolbar: ['[role="toolbar"]', 'display'],
    })
    assert.notEqual(t.pressed, transparent)
    assert.equal(t.unpressed, transparent)
    assert.ok(['inline-flex', 'flex'].includes(t.toolbar), 'inline-flex, or flex once blockified inside a flex row')

    const toast = await styles('toast', { viewport: ['ol:has(> li[data-swipe-direction])', 'position'] })
    assert.equal(toast.viewport, 'fixed')
  })
})
