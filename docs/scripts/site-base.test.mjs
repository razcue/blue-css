import assert from 'node:assert/strict'
import { test } from 'node:test'
import { rewrite } from './site-base.mjs'

const origin = 'https://razcue.github.io'

test('adds the base path to same-origin URLs and the favicon, once', () => {
  const md = '- [Intro](https://razcue.github.io/raw/intro.md)'
  const once = rewrite('llms.txt', md, origin, '/blue-css/')
  assert.equal(once, '- [Intro](https://razcue.github.io/blue-css/raw/intro.md)')
  assert.equal(rewrite('llms.txt', once, origin, '/blue-css/'), once)

  const html = '<link rel="icon" href="/favicon.ico">'
  assert.equal(rewrite('index.html', html, origin, '/blue-css/'), '<link rel="icon" href="/blue-css/favicon.ico">')
})

test('leaves root deployments and other files alone', () => {
  assert.equal(rewrite('llms.txt', 'https://razcue.github.io/x', origin, '/'), 'https://razcue.github.io/x')
  assert.equal(rewrite('app.js', 'https://razcue.github.io/x', origin, '/blue-css/'), 'https://razcue.github.io/x')
})
