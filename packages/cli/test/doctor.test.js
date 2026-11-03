import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Writable } from 'node:stream'
import { after, before, describe, it } from 'node:test'
import { run } from '../src/cli.js'
import { loadChromium, serveDirectory } from '../src/doctor.js'

let hasBrowser = true
try {
  loadChromium()
} catch {
  hasBrowser = false
}

const page = (title, body, css = '/blue.css') =>
  `<!doctype html><html><head><title>${title}</title>${css ? `<link rel="stylesheet" href="${css}">` : ''}</head><body>${body}</body></html>`

// Runtime content the build scan cannot see: tag names and roles arrive as data.
const cmsScript = `<script>
  const block = { tag: ['dia', 'log'].join(''), role: ['tab', 'list'].join('') }
  const d = document.createElement(block.tag); d.id = 'promo'
  const t = document.createElement('div'); t.setAttribute('role', block.role)
  document.getElementById('content').append(d, t)
</script>`

const dir = await mkdtemp(join(tmpdir(), 'blue-doctor-'))
const dist = join(dir, 'dist')
after(() => rm(dir, { recursive: true, force: true }))

before(async () => {
  await mkdir(join(dist, 'docs'), { recursive: true })
  await writeFile(join(dist, 'index.html'), page('Home', '<main><table><tr><td>Ada</td></tr></table><a href="/cms.html">CMS</a></main>'))
  await writeFile(join(dist, 'cms.html'), page('CMS', `<main id="content"></main>${cmsScript}`))
  await writeFile(
    join(dist, 'docs', 'index.html'),
    page('Docs', '<main><div data-blue="off"><dialog></dialog></div><button data-slot="button">shadcn</button></main>'),
  )
  await writeFile(join(dir, 'plain.html'), page('Plain', '<main><table></table></main>', null))
  await writeFile(join(dir, 'secret.txt'), 'nope')
})

function sink() {
  let text = ''
  const stream = new Writable({ write(chunk, _enc, cb) { text += chunk; cb() } })
  return { stream, get text() { return text } }
}

async function cli(args) {
  const out = sink()
  const err = sink()
  const code = await run(args, { cwd: dir, stdout: out.stream, stderr: err.stream })
  return { code, stdout: out.text, stderr: err.text }
}

describe('serveDirectory', () => {
  it('serves files, directory indexes and extensionless paths, and refuses traversal', async () => {
    const server = await serveDirectory(dist)
    try {
      assert.equal((await fetch(`${server.origin}/`)).status, 200)
      assert.equal((await fetch(`${server.origin}/docs/`)).status, 200)
      assert.equal((await fetch(`${server.origin}/cms`)).status, 200)
      assert.match((await fetch(`${server.origin}/cms.html`)).headers.get('content-type'), /text\/html/)
      assert.notEqual((await fetch(`${server.origin}/%2e%2e/secret.txt`)).status, 200)
    } finally {
      await server.close()
    }
  })
})

describe('blue-css doctor', { skip: !hasBrowser && 'Playwright is not installed' }, () => {
  it('flags modules that only runtime content needs, and exits 1', async () => {
    // The docs page is not scanned: its opted-out <dialog> must not count either way.
    assert.equal((await cli(['build', 'dist/index.html', 'dist/cms.html', '-o', 'dist/blue.css'])).code, 0)

    const { code, stdout } = await cli(['doctor', 'dist', '--json'])
    assert.equal(code, 1)
    const report = JSON.parse(stdout)
    assert.equal(report.pages.length, 3)
    const missing = Object.fromEntries(report.missing.map((m) => [m.module, m]))
    assert.deepEqual(Object.keys(missing).sort(), ['dialog', 'motion', 'tabs'])
    assert.ok(missing.dialog.pages.every((u) => u.endsWith('/cms.html')))
    assert.deepEqual(missing.dialog.hits[0].samples, ['dialog#promo'])
    assert.deepEqual(missing.tabs.hits[0].samples, ['main#content > div[role=tablist]'])
    assert.deepEqual(missing.motion.via, ['dialog'])
  })

  it('prints a readable report with a safelist suggestion', async () => {
    const { code, stdout } = await cli(['doctor', 'dist'])
    assert.equal(code, 1)
    assert.match(stdout, /✗ dialog \(\+ motion\)\s+on \/cms\.html/)
    assert.match(stdout, /safelist: \['dialog', 'tabs'\]/)
  })

  it('ignores opted-out subtrees and shadcn components', async () => {
    const { stdout } = await cli(['doctor', 'dist/docs/index.html', '--root', 'dist', '--json'])
    const [docs] = JSON.parse(stdout).pages
    assert.ok(docs.hasBlue, 'absolute /blue.css resolves against --root')
    assert.deepEqual(docs.missing, [])
  })

  it('passes once the safelist covers runtime content, crawling from one page', async () => {
    assert.equal((await cli(['build', 'dist/index.html', 'dist/cms.html', '-o', 'dist/blue.css', '-s', 'dialog,tabs'])).code, 0)
    const { code, stdout } = await cli(['doctor', 'dist/index.html', '--crawl'])
    assert.equal(code, 0, stdout)
    assert.match(stdout, /Inspected 2 page\(s\)/)
    assert.match(stdout, /✓ every element Blue styles had its module shipped/)
  })

  it('respects --max-pages', async () => {
    const { stdout } = await cli(['doctor', 'dist', '--max-pages', '1', '--json'])
    assert.equal(JSON.parse(stdout).pages.length, 1)
  })

  it('reports pages without a Blue stylesheet', async () => {
    const { code, stdout } = await cli(['doctor', 'plain.html'])
    assert.equal(code, 1)
    assert.match(stdout, /no Blue stylesheet found/)
  })

  it('without --root, a nested file resolves absolute paths against its own folder', async () => {
    const { stdout } = await cli(['doctor', 'dist/docs/index.html'])
    assert.match(stdout, /no Blue stylesheet found/)
  })

  it('rejects bad input', async () => {
    assert.equal((await cli(['doctor'])).code, 2)
    const missing = await cli(['doctor', 'nope/'])
    assert.equal(missing.code, 1)
    assert.match(missing.stderr, /Not a URL, directory or file/)
    assert.match((await cli(['doctor', 'dist', '--wait', 'soon'])).stderr, /--wait must be/)
    assert.match((await cli(['doctor', 'plain.html', '--root', 'dist'])).stderr, /outside --root/)
    // Fails after its local server started: the server must still be closed (no hang).
    await mkdir(join(dir, 'empty'), { recursive: true })
    assert.match((await cli(['doctor', 'empty'])).stderr, /No HTML files/)
  })
})
