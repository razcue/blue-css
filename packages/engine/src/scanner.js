/**
 * Manifest-driven scanner.
 *
 * Builds two regular expressions from the trigger tokens of the given
 * manifests and extracts only those tokens from arbitrary text: HTML, compiled
 * framework output (Vue, React, Svelte, Solid, Angular), JSON payloads, or
 * component sources.
 *
 * The scanner errs on the side of inclusion: a false positive costs a few
 * bytes, a false negative ships an unstyled page.
 */

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Parse a token string into its parts.
 * @param {string} token
 * `text:<literal>` matches a library marker anywhere in the text, such as a CSS
 * variable a component writes into its inline style (`text:--reka-collapsible-content-height`).
 * @returns {{ kind: 'tag' | 'text', name: string } | { kind: 'attr', name: string, value?: string }}
 */
export function parseToken(token) {
  const text = /^text:([\w-]{3,})$/.exec(token)
  if (text) return { kind: 'text', name: text[1] }
  const match = /^(tag|attr):([a-z][\w-]*)(?:=([\w-]+))?$/i.exec(token)
  if (!match) {
    throw new Error(`Invalid trigger token "${token}". Expected tag:<name>, attr:<name>, attr:<name>=<value> or text:<literal>.`)
  }
  const [, kind, name, value] = match
  if (kind === 'tag' && value !== undefined) throw new Error(`Invalid trigger token "${token}": tags cannot have values.`)
  return kind === 'tag' ? { kind, name: name.toLowerCase() } : { kind, name, value }
}

/**
 * Collect the vocabulary (tag and attribute names) the manifests care about.
 * @param {import('./types').Manifest[]} manifests
 */
export function vocabulary(manifests) {
  const tags = new Set()
  const attrs = new Set()
  const texts = new Set()
  for (const manifest of manifests) {
    for (const mod of manifest.modules) {
      for (const token of mod.triggers ?? []) {
        const t = parseToken(token)
        if (t.kind === 'tag') tags.add(t.name)
        else if (t.kind === 'text') texts.add(t.name)
        else attrs.add(t.name)
      }
    }
  }
  return { tags, attrs, texts }
}

/**
 * @param {import('./types').Manifest[]} manifests
 */
export function createScanner(manifests) {
  const { tags, attrs, texts } = vocabulary(manifests)
  const byLength = (a, b) => b.length - a.length
  const tagList = [...tags].sort(byLength).map(escape).join('|')
  const attrList = [...attrs].sort(byLength).map(escape).join('|')
  const textList = [...texts].sort(byLength).map(escape).join('|')

  // Tags appear as `<tag` in markup (also inside JS strings), or as a quoted
  // string passed as an argument, array item or element-ish prop in compiled output:
  //   createElementVNode("dialog"  jsx("dialog"  h('dialog')  ɵɵelementStart(0, "dialog")
  //   document.createElement("dialog")  as: "button"  tag: "nav"  default: "button"
  // A bare `case "dialog":`, `x === "dialog"` or `enforce: "pre"` is not.
  const tagRe = tagList
    ? new RegExp(
        String.raw`(?:<|(?:[(,\[]|\b(?:as|tag|is|el|element|component|default)\s*:)\s*\\?["'\x60])(${tagList})(?=[\s/>"'\x60\\]|$)`,
        'gi',
      )
    : null

  // Attributes appear in markup (`role="tab"`, `role=tab`, `popover`), in
  // compiled props (`role: "tab"`, `"data-variant": "x"`), escaped inside JS
  // strings (`role=\"tab\"`), in JSX (`role={"tab"}`) or via setAttribute.
  const attrRe = attrList
    ? new RegExp(
        String.raw`(?<![\w-])(${attrList})(?![\w-])(?:\\?["'\x60]?\s*[=:,]\s*\{?\s*\\?["'\x60]?([\w-]*))?`,
        'g',
      )
    : null

  const textRe = textList ? new RegExp(`(?<![\\w-])(${textList})(?![\\w-])`, 'g') : null

  /**
   * Scan text and add the tokens found to `into`.
   * @param {string} text
   * @param {Set<string>} [into]
   * @returns {Set<string>}
   */
  function scan(text, into = new Set()) {
    if (tagRe) {
      tagRe.lastIndex = 0
      for (const m of text.matchAll(tagRe)) into.add(`tag:${m[1].toLowerCase()}`)
    }
    if (attrRe) {
      attrRe.lastIndex = 0
      for (const m of text.matchAll(attrRe)) {
        into.add(`attr:${m[1]}`)
        if (m[2]) into.add(`attr:${m[1]}=${m[2]}`)
      }
    }
    if (textRe) {
      textRe.lastIndex = 0
      for (const m of text.matchAll(textRe)) into.add(`text:${m[1]}`)
    }
    return into
  }

  return { scan, tags, attrs, texts }
}
