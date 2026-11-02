import assert from 'node:assert/strict'
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { build, createServer } from 'vite'
import blue, { DEV_PATH } from '../src/index.js'

const root = fileURLToPath(new URL('./fixtures/app/', import.meta.url))
const tmp = await mkdtemp(join(tmpdir(), 'blue-vite-'))
after(() => rm(tmp, { recursive: true, force: true }))

async function buildApp(options = {}, viteConfig = {}) {
  const outDir = await mkdtemp(join(tmp, 'out-'))
  const plugin = blue({ report: false, ...options })
  await build({
    root,
    logLevel: 'silent',
    plugins: [vue(), plugin],
    build: { outDir, emptyOutDir: true },
    ...viteConfig,
  })
  const html = await readFile(join(outDir, 'index.html'), 'utf8')
  const assets = await readdir(join(outDir, 'assets'))
  return { plugin, outDir, html, assets }
}

describe('@blue-css/vite build', () => {
  it('emits a hashed, shaken stylesheet and links it', async () => {
    const { plugin, outDir, html, assets } = await buildApp()
    const file = assets.find((f) => /^blue-[\w-]+\.css$/.test(f))
    assert.ok(file, `no blue-*.css in ${assets}`)
    assert.equal(plugin.api.fileName, `assets/${file}`)
    assert.match(html, new RegExp(`<link rel="stylesheet" href="/assets/${file}">`))

    const ids = plugin.api.result.included.map((m) => m.id)
    assert.ok(ids.includes('table'), 'table from the Vue component')
    assert.ok(ids.includes('tabs'), 'role="tab" from the Vue component')
    assert.ok(ids.includes('details'), '<details> from index.html')
    assert.ok(!ids.includes('dialog'), 'nothing renders a dialog')
    assert.ok(!ids.includes('forms'), 'the Vue runtime must not pull in forms')

    const css = await readFile(join(outDir, 'assets', file), 'utf8')
    assert.equal(css, plugin.api.result.css)
  })

  it('respects base, safelist, extra content and inject: false', async () => {
    const { html, plugin } = await buildApp(
      { safelist: ['dialog'], content: ['index.html'], inject: false },
      { base: '/app/' },
    )
    assert.doesNotMatch(html, /blue-[\w-]+\.css/)
    assert.equal(plugin.api.href, `/app/${plugin.api.fileName}`)
    assert.ok(plugin.api.result.included.some((m) => m.id === 'dialog' && m.reason === 'safelist'))
  })

  it('changes the file name when the shipped CSS changes', async () => {
    const a = await buildApp()
    const b = await buildApp({ safelist: ['dialog'] })
    assert.notEqual(a.plugin.api.fileName, b.plugin.api.fileName)
  })
})

describe('@blue-css/vite dev', () => {
  it('serves the full stylesheet and links it from index.html', async () => {
    const server = await createServer({
      root,
      logLevel: 'silent',
      plugins: [vue(), blue()],
      server: { port: 0, strictPort: false, hmr: false },
    })
    await server.listen()
    try {
      const { port } = server.httpServer.address()
      const base = `http://localhost:${port}`

      const html = await (await fetch(base + '/')).text()
      assert.match(html, new RegExp(`<link rel="stylesheet" href="/${DEV_PATH}">`))

      const res = await fetch(`${base}/${DEV_PATH}`)
      assert.equal(res.status, 200)
      assert.match(res.headers.get('content-type'), /text\/css/)
      const css = await res.text()
      for (const layer of ['blue.components', 'blue.roles', 'blue.containers']) assert.ok(css.includes(layer), layer)
    } finally {
      await server.close()
    }
  })
})
