import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Writable } from 'node:stream'
import { after, describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { run } from '../src/cli.js'

const examples = fileURLToPath(new URL('../../../examples/', import.meta.url))
const dir = await mkdtemp(join(tmpdir(), 'blue-cli-'))
after(() => rm(dir, { recursive: true, force: true }))

function sink() {
  let text = ''
  const stream = new Writable({ write(chunk, _enc, cb) { text += chunk; cb() } })
  return { stream, get text() { return text } }
}

async function cli(args, cwd = dir) {
  const out = sink()
  const err = sink()
  const code = await run(args, { cwd, stdout: out.stream, stderr: err.stream })
  return { code, stdout: out.text, stderr: err.text }
}

describe('blue-css', () => {
  it('prints help', async () => {
    const { code, stdout } = await cli(['--help'])
    assert.equal(code, 0)
    assert.match(stdout, /blue-css build/)
  })

  it('build writes a shaken stylesheet and reports', async () => {
    const out = join(dir, 'out/blue.css')
    const { code, stderr } = await cli(['build', join(examples, 'login.html'), '-o', out, '--report'])
    assert.equal(code, 0, stderr)
    const css = await readFile(out, 'utf8')
    assert.match(css, /^@layer blue\.tokens/)
    assert.match(stderr, /\+ forms/)
    assert.match(stderr, /- table/)
    assert.match(stderr, /% smaller/)
  })

  it('build writes to stdout without --out', async () => {
    const { code, stdout } = await cli(['build', join(examples, 'login.html'), '--no-minify', '--no-reset'])
    assert.equal(code, 0)
    assert.match(stdout, /@layer blue\.base/)
    assert.doesNotMatch(stdout, /@layer blue\.reset \{/)
  })

  it('full ships every module', async () => {
    const { code, stdout } = await cli(['full'])
    assert.equal(code, 0)
    assert.match(stdout, /blue\.roles/)
  })

  it('scan --json lists tokens and modules', async () => {
    const { code, stdout } = await cli(['scan', join(examples, 'dashboard.html'), '--json'])
    assert.equal(code, 0)
    const report = JSON.parse(stdout)
    assert.ok(report.tokens.includes('attr:role=tab'))
    assert.ok(report.included.some((m) => m.id === 'tabs'))
    assert.ok(report.excluded.includes('dialog'))
  })

  it('reads blue.config.mjs and its safelist', async () => {
    const project = await mkdtemp(join(dir, 'project-'))
    await writeFile(join(project, 'index.html'), '<main><p>Hello</p></main>')
    await writeFile(
      join(project, 'blue.config.mjs'),
      `export default { content: ['index.html'], out: 'dist/blue.css', safelist: ['dialog'] }`,
    )
    const { code, stderr } = await cli(['build', '--report'], project)
    assert.equal(code, 0, stderr)
    assert.match(stderr, /\+ dialog\s+safelist/)
    assert.match(await readFile(join(project, 'dist/blue.css'), 'utf8'), /dialog/)
  })

  it('exits non-zero with a helpful message on errors', async () => {
    const unknown = await cli(['frobnicate'])
    assert.equal(unknown.code, 2)
    assert.match(unknown.stderr, /unknown command/)

    const empty = await cli(['build', 'nothing-here/**/*.html'])
    assert.equal(empty.code, 1)
    assert.match(empty.stderr, /No files matched/)
  })
})
