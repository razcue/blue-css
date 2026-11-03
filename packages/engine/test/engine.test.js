import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { build, buildCss, core, createScanner, diagnose, MODULES_PROPERTY, parseToken, resolve, SCOPE } from '../src/index.js'

const fixture = (name) => readFile(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')
const examples = fileURLToPath(new URL('../../../examples/', import.meta.url))
const scanner = createScanner([core])
const scan = (text) => scanner.scan(text)

describe('parseToken', () => {
  it('parses tags and attributes', () => {
    assert.deepEqual(parseToken('tag:dialog'), { kind: 'tag', name: 'dialog' })
    assert.deepEqual(parseToken('attr:popover'), { kind: 'attr', name: 'popover', value: undefined })
    assert.deepEqual(parseToken('attr:role=tab'), { kind: 'attr', name: 'role', value: 'tab' })
  })

  it('parses text markers', () => {
    assert.deepEqual(parseToken('text:--reka-collapsible-content-height'), { kind: 'text', name: '--reka-collapsible-content-height' })
    assert.throws(() => parseToken('text:a b'), /Invalid trigger token/)
  })

  it('rejects malformed tokens', () => {
    assert.throws(() => parseToken('dialog'), /Invalid trigger token/)
    assert.throws(() => parseToken('tag:dialog=x'), /tags cannot have values/)
  })
})

describe('scanner', () => {
  it('finds tags and attributes in HTML', () => {
    const t = scan(`<main><dialog open><div role="tablist"><button role=tab>A</button></div>
      <span data-badge>New</span><div popover id="p"></div><input type="checkbox" role="switch"></dialog></main>`)
    for (const token of [
      'tag:main', 'tag:dialog', 'tag:button', 'tag:input',
      'attr:role=tablist', 'attr:role=tab', 'attr:role=switch', 'attr:data-badge', 'attr:popover', 'attr:type=checkbox',
    ]) assert.ok(t.has(token), `missing ${token}`)
  })

  it('does not confuse attributes sharing a prefix', () => {
    const t = scan(`<button popovertarget="menu">Open</button><p data-badges="1">x</p>`)
    assert.ok(!t.has('attr:popover'))
    assert.ok(!t.has('attr:data-badge'))
  })

  it('reads compiled Vue output, including static vnodes', async () => {
    const t = scan(await fixture('vue-compiled.js'))
    for (const token of [
      'tag:article', 'tag:header', 'tag:table', 'tag:button', 'tag:dialog',
      'attr:data-badge', 'attr:role=alert',
    ]) assert.ok(t.has(token), `missing ${token}`)
    // Manifest-driven: data-variant triggers no module, so it is not collected.
    assert.ok(![...t].some((x) => x.startsWith('attr:data-variant')))
  })

  it('reads what reka-ui renders from node_modules', async () => {
    const t = scan(await fixture('reka-tabs-trigger.js'))
    assert.ok(t.has('attr:role=tab'))
    assert.ok(t.has('tag:button'), 'reka `as: "button"` default')
  })

  it('reads JSX runtime, Angular and DOM API calls', () => {
    const t = scan(`jsx("table",{}); ɵɵelementStart(0, "details"); document.createElement('dialog');
      el.setAttribute("role", "menu"); h('progress'); <div role={"tooltip"} />`)
    for (const token of ['tag:table', 'tag:details', 'tag:dialog', 'tag:progress', 'attr:role=menu', 'attr:role=tooltip'])
      assert.ok(t.has(token), `missing ${token}`)
  })

  it('reads escaped markup inside JS strings', () => {
    const t = scan(`_createStaticVNode("<div role=\\"alert\\" data-layout=\\"grid\\">x</div><meter>")`)
    assert.ok(t.has('attr:role=alert'))
    assert.ok(t.has('attr:data-layout=grid'))
    assert.ok(t.has('tag:meter'))
  })

  it('only reads quoted values after element-ish keys', () => {
    const t = scan(`{name:\`nuxt:head\`,enforce:\`pre\`} {as:"dialog"} {tag: 'table'}`)
    assert.ok(!t.has('tag:pre'), 'enforce: "pre" is a plugin option, not an element')
    assert.ok(t.has('tag:dialog'))
    assert.ok(t.has('tag:table'))
  })

  it('finds text markers as whole words only', () => {
    const preset = { name: 'p', dir: core.dir, layers: ['presets'], modules: [{ id: 'x', file: 'x.css', layer: 'presets', triggers: ['text:--lib-height'] }] }
    const s = createScanner([core, preset])
    assert.ok(s.scan('style: { "--lib-height": h }').has('text:--lib-height'))
    assert.ok(!s.scan('--lib-heights').has('text:--lib-height'))
  })

  it('ignores tag names in framework internals', () => {
    // React DOM: switch(type){case "dialog": …}; Vue: makeMap("html,body,dialog,…")
    const t = scan(`switch(n){case "dialog":case "details":break} n==="table"; makeMap("html,body,dialog,details,table")`)
    assert.ok(!t.has('tag:dialog'))
    assert.ok(!t.has('tag:details'))
    assert.ok(!t.has('tag:table'))
  })
})

describe('resolve', () => {
  it('always ships tokens, reset and base', () => {
    const ids = resolve([core], []).modules.map((m) => m.id)
    assert.deepEqual(ids, ['tokens', 'reset', 'base'])
  })

  it('pulls in triggered modules and their dependencies', () => {
    const { modules, reasons } = resolve([core], ['tag:dialog'])
    const ids = modules.map((m) => m.id)
    assert.ok(ids.includes('dialog'))
    assert.ok(ids.includes('motion'))
    assert.equal(reasons.get('motion'), 'dependency of dialog')
    assert.ok(!ids.includes('table'))
  })

  it('honours safelist ids and tokens, and reset: false', () => {
    const ids = resolve([core], [], { safelist: ['table', 'attr:role=tab'], reset: false }).modules.map((m) => m.id)
    assert.ok(ids.includes('table'))
    assert.ok(ids.includes('tabs'))
    assert.ok(!ids.includes('reset'))
    assert.throws(() => resolve([core], [], { safelist: ['tabel'] }), /Invalid trigger token/)
  })

  it('keeps manifest order', () => {
    const ids = resolve([core], 'all').modules.map((m) => m.id)
    assert.deepEqual(ids, core.modules.map((m) => m.id))
  })

  it('rejects duplicate ids and unknown deps', () => {
    const preset = (modules) => ({ name: 'p', dir: core.dir, layers: ['presets'], modules })
    assert.throws(() => resolve([core, preset([{ id: 'dialog', file: 'x.css', layer: 'presets' }])], []), /Duplicate module id/)
    assert.throws(() => resolve([core, preset([{ id: 'x', file: 'x.css', layer: 'presets', deps: ['nope'] }])], []), /unknown module "nope"/)
  })
})

describe('build', () => {
  it('every core module file exists, is valid CSS and has a known layer', async () => {
    const { modules } = resolve([core], 'all')
    for (const mod of modules) {
      await assert.doesNotReject(build([core], [mod], { minify: false }), `module ${mod.id}`)
    }
  })

  it('wraps modules in blue layers and the opt-out scope', async () => {
    const { modules } = resolve([core], ['tag:table'])
    const { css } = await build([core], modules, { minify: false })
    assert.match(css, /^@layer blue\.tokens, blue\.reset, blue\.base, blue\.layout, blue\.components, blue\.roles, blue\.presets, blue\.containers;/)
    assert.match(css, /@layer blue\.components \{\s*@scope \(:root\) to \(\[data-blue="off"\]\)/)
    assert.match(css, /table/)
    assert.doesNotMatch(css, /dialog/)
    assert.equal(SCOPE, '@scope (:root) to ([data-blue="off"])')
  })

  it('keeps tokens and reset unscoped', async () => {
    const { modules } = resolve([core], [])
    const { css } = await build([core], modules, { minify: false })
    const tokens = css.slice(0, css.indexOf('@layer blue.reset {'))
    assert.doesNotMatch(tokens, /@scope/)
  })

  it('minifies', async () => {
    const { modules } = resolve([core], 'all')
    const readable = await build([core], modules, { minify: false })
    const min = await build([core], modules, { minify: true })
    assert.ok(min.bytes < readable.bytes)
    assert.ok(min.gzip > 0 && min.gzip < min.bytes)
  })
})

describe('diagnose', () => {
  const hit = (n = 1, samples = ['x']) => ({ count: n, samples })

  it('reports modules the DOM needs but the stylesheet lacks', () => {
    const d = diagnose([core], { 'tag:dialog': hit(), 'tag:table': hit(2) }, ['tokens', 'base', 'table'])
    assert.deepEqual(d.required, ['motion', 'table', 'dialog'])
    assert.deepEqual(d.missing.map((m) => m.module), ['motion', 'dialog'])
    const dialog = d.missing.find((m) => m.module === 'dialog')
    assert.deepEqual(dialog.hits, [{ token: 'tag:dialog', count: 1, samples: ['x'] }])
    assert.deepEqual(d.missing.find((m) => m.module === 'motion').via, ['dialog'])
  })

  it('reports unused and unknown shipped modules', () => {
    const d = diagnose([core], { 'tag:table': hit() }, ['tokens', 'table', 'dialog', 'reka/tabs'])
    assert.deepEqual(d.missing, [])
    assert.deepEqual(d.unused, ['dialog'])
    assert.deepEqual(d.unknown, ['reka/tabs'])
  })

  it('never requires always-on modules', () => {
    const d = diagnose([core], { 'tag:p': hit() }, [])
    assert.deepEqual(d.missing, [])
  })
})

describe('buildCss', () => {
  it('declares the shipped modules in --blue-modules', async () => {
    const { css } = await buildCss({ content: [`${examples}login.html`], minify: false })
    const match = new RegExp(`${MODULES_PROPERTY}: "([^"]+)"`).exec(css)
    assert.ok(match, 'marker present')
    assert.deepEqual(match[1].split(' '), ['tokens', 'reset', 'base', 'motion', 'layout', 'button', 'forms', 'card'])
  })

  it('shakes against built output', async () => {
    const login = await buildCss({ content: [`${examples}login.html`] })
    const full = await buildCss({ full: true })
    const ids = login.included.map((m) => m.id)
    assert.ok(ids.includes('forms'))
    assert.ok(ids.includes('card'))
    assert.ok(!ids.includes('table'))
    assert.ok(!ids.includes('tabs'))
    assert.ok(login.excluded.includes('dialog'))
    assert.ok(login.bytes < full.bytes)
    assert.equal(login.files.length, 1)
  })

  it('expands directories and skips CSS and source maps', async () => {
    const result = await buildCss({ content: [examples] })
    assert.ok(result.files.length >= 3)
    assert.ok(result.files.every((f) => f.endsWith('.html')))
  })

  it('never scans source maps', async () => {
    const { SOURCE_MAP } = await import('../src/index.js')
    for (const f of ['a.js.map', 'a.js.map.json', 'b.css.map']) assert.ok(SOURCE_MAP.test(f), f)
    assert.ok(!SOURCE_MAP.test('payload.json'))
  })

  it('fails loudly when nothing matches', async () => {
    await assert.rejects(buildCss({ content: ['does-not-exist/**/*.html'] }), /No files matched/)
    await assert.rejects(buildCss({}), /No `content` to scan/)
  })
})
