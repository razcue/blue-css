// End-to-end: build the playground with Nuxt and check what ships.
import assert from 'node:assert/strict'
import { execFile, spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { readdir, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { after, before, describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { loadNuxt } from '@nuxt/kit'

const playground = fileURLToPath(new URL('../playground/', import.meta.url))
const nuxi = fileURLToPath(new URL('../node_modules/.bin/nuxi', import.meta.url))
const output = join(playground, '.output')
const assetsDir = join(output, 'public', '_nuxt')

describe('@blue-css/nuxt production build', { timeout: 300_000 }, () => {
  let fileName
  let css

  before(async () => {
    await rm(output, { recursive: true, force: true })
    await promisify(execFile)(nuxi, ['build'], { cwd: playground, env: { ...process.env, NUXT_TELEMETRY_DISABLED: '1' } })
    fileName = (await readdir(assetsDir)).find((f) => /^blue\.[\w-]{8}\.css$/.test(f))
    assert.ok(fileName, 'blue.<hash>.css written to _nuxt/')
    css = await readFile(join(assetsDir, fileName), 'utf8')
  })

  it('ships what the client bundle renders', () => {
    assert.match(css, /role=tab\]/, 'tabs (client component)')
    assert.match(css, /data-badge/, 'badge (client component)')
    assert.match(css, /tbody/, 'table (client component)')
  })

  it('ships what only server components render', () => {
    // ServerNote.server.vue renders role="note"; it never reaches the client.
    assert.match(css, /--_tone/, 'alert module')
  })

  it('shakes what nothing renders, including the Vue runtime\'s own strings', () => {
    assert.doesNotMatch(css, /popover-open/, 'popover')
    assert.doesNotMatch(css, /progress-value/, 'feedback')
    assert.doesNotMatch(css, /field-sizing/, 'forms')
    assert.doesNotMatch(css, /blue\.containers\{/, 'containers')
  })

  it('links the stylesheet from prerendered pages', async () => {
    const html = await readFile(join(output, 'public', 'about', 'index.html'), 'utf8')
    assert.ok(html.includes(`<link rel="stylesheet" href="/_nuxt/${fileName}">`))
  })

  it('links and serves the stylesheet from the SSR server', async () => {
    const port = 3900 + Math.floor(Math.random() * 90)
    const server = spawn(process.execPath, [join(output, 'server', 'index.mjs')], {
      env: { ...process.env, PORT: String(port) },
      stdio: 'ignore',
    })
    try {
      let html
      for (let i = 0; i < 50 && !html; i++) {
        html = await fetch(`http://localhost:${port}/`).then((r) => r.text(), () => undefined)
        if (!html) await new Promise((r) => setTimeout(r, 100))
      }
      assert.ok(html?.includes(`<link rel="stylesheet" href="/_nuxt/${fileName}">`), 'SSR page links the stylesheet')
      const res = await fetch(`http://localhost:${port}/_nuxt/${fileName}`)
      assert.equal(res.status, 200)
      assert.match(res.headers.get('cache-control') ?? '', /immutable/)
    } finally {
      server.kill()
    }
  })
})

describe('@blue-css/nuxt dev', { timeout: 120_000 }, () => {
  let nuxt
  after(() => nuxt?.close())

  it('adds the full stylesheet to the app CSS', async () => {
    nuxt = await loadNuxt({ cwd: playground, dev: true, ready: true, overrides: { telemetry: false } })
    const file = nuxt.options.css.find((c) => typeof c === 'string' && c.endsWith(join('blue-css', 'blue.css')))
    assert.ok(file && existsSync(file), 'full stylesheet written to the build dir')
    const full = await readFile(file, 'utf8')
    for (const layer of ['blue.components', 'blue.roles', 'blue.containers']) assert.ok(full.includes(layer), layer)
  })
})
