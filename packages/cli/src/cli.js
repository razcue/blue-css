import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, relative, resolve as resolvePath } from 'node:path'
import { parseArgs } from 'node:util'
import { buildCss, loadConfig, loadManifests } from '@blue-css/engine'
import { formatReport, runDoctor } from './doctor.js'

const HELP = `
blue-css — tree-shaken, classless CSS for semantic HTML

Usage
  blue-css build [content...] [options]   scan built output, write only the CSS it uses
  blue-css full [options]                 write the complete stylesheet
  blue-css scan [content...] [options]    show which tokens and modules were detected
  blue-css doctor <target...> [options]   render pages, report elements whose styles were shaken away

Content
  Globs or directories of your *built* output (HTML, JS chunks, JSON payloads),
  e.g. "dist" or "dist/**/*.{html,js}". Run after your framework's build.
  Falls back to \`content\` in blue.config.{js,mjs}.

Options
  -o, --out <file>        output file (default: config.out, else stdout)
  -c, --config <file>     config file (default: ./blue.config.{js,mjs})
  -s, --safelist <ids>    comma-separated module ids or tokens to always ship
      --preset <name>     add a preset package (repeatable)
      --no-reset          drop Blue's reset (when Tailwind preflight is present)
      --no-minify         readable output
      --report            print a size and module report to stderr
      --json              (scan, doctor) machine-readable output

Doctor
  Targets are URLs (start your server first), build directories (served
  locally; every *.html is a starting page) or HTML files. Needs Playwright.
      --crawl             follow same-origin links
      --max-pages <n>     stop after n pages (default 50)
      --wait <ms>         extra wait after load, for client-rendered content
      --root <dir>        where absolute paths resolve when given HTML files
                          (default: the file's folder; pass the build dir)
  Exits 1 when an element's module is missing, so it can gate CI.
  -h, --help
  -v, --version

Examples
  vite build && blue-css build dist -o dist/assets/blue.css --report
  blue-css build ".output/public" ".output/server/chunks" -o .output/public/blue.css
  blue-css full -o public/blue.css
  blue-css doctor dist
  blue-css doctor http://localhost:3000 --crawl
`

const kb = (n) => `${(n / 1024).toFixed(1)} kB`

/**
 * Run the CLI.
 * @param {string[]} argv arguments after the binary name
 * @param {{ cwd?: string, stdout?: NodeJS.WritableStream, stderr?: NodeJS.WritableStream }} [io]
 * @returns {Promise<number>} exit code
 */
export async function run(argv, io = {}) {
  const cwd = io.cwd ?? process.cwd()
  const stdout = io.stdout ?? process.stdout
  const stderr = io.stderr ?? process.stderr
  const say = (s = '') => stderr.write(s + '\n')

  let parsed
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        out: { type: 'string', short: 'o' },
        config: { type: 'string', short: 'c' },
        safelist: { type: 'string', short: 's' },
        preset: { type: 'string', multiple: true },
        'no-reset': { type: 'boolean' },
        'no-minify': { type: 'boolean' },
        report: { type: 'boolean' },
        json: { type: 'boolean' },
        crawl: { type: 'boolean' },
        'max-pages': { type: 'string' },
        wait: { type: 'string' },
        root: { type: 'string' },
        help: { type: 'boolean', short: 'h' },
        version: { type: 'boolean', short: 'v' },
      },
    })
  } catch (error) {
    say(`blue-css: ${error.message}\nRun \`blue-css --help\` for usage.`)
    return 2
  }

  const { values, positionals } = parsed
  const [command, ...content] = positionals

  if (values.version) {
    const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
    stdout.write(pkg.version + '\n')
    return 0
  }
  if (values.help || !command) {
    stdout.write(HELP.trimStart())
    return values.help ? 0 : 2
  }
  if (!['build', 'full', 'scan', 'doctor'].includes(command)) {
    say(`blue-css: unknown command "${command}".\nRun \`blue-css --help\` for usage.`)
    return 2
  }

  if (command === 'doctor') return doctor(content, values, { cwd, stdout, say })

  try {
    const config = await loadConfig({ cwd, file: values.config })
    const options = {
      ...config,
      cwd: config.configFile ? dirname(config.configFile) : cwd,
      full: command === 'full',
      content: content.length ? content : config.content,
      safelist: [
        ...(config.safelist ?? []),
        ...(values.safelist?.split(',').map((s) => s.trim()).filter(Boolean) ?? []),
      ],
      presets: [...(config.presets ?? []), ...(values.preset ?? [])],
      reset: values['no-reset'] ? false : config.reset,
      minify: values['no-minify'] ? false : config.minify,
    }
    // Positional content is relative to where the command runs, not the config.
    if (content.length) options.content = content.map((c) => resolvePath(cwd, c))

    const result = await buildCss(options)

    if (command === 'scan') {
      if (values.json) {
        stdout.write(
          JSON.stringify(
            { files: result.files.length, tokens: [...result.tokens].sort(), included: result.included, excluded: result.excluded },
            null,
            2,
          ) + '\n',
        )
      } else {
        stdout.write(`Scanned ${result.files.length} file(s)\n\nTokens\n`)
        for (const t of [...result.tokens].sort()) stdout.write(`  ${t}\n`)
        stdout.write('\nModules\n')
        for (const m of result.included) stdout.write(`  + ${m.id.padEnd(12)} ${m.reason}\n`)
        for (const id of result.excluded) stdout.write(`  - ${id}\n`)
      }
      return 0
    }

    const out = values.out ?? (config.out && resolvePath(options.cwd, config.out))
    if (out) {
      const file = resolvePath(cwd, out)
      await mkdir(dirname(file), { recursive: true })
      await writeFile(file, result.css)
      const shown = relative(cwd, file)
      say(`blue-css: wrote ${shown.startsWith('..') ? file : shown} (${kb(result.bytes)}, ${kb(result.gzip)} gzip)`)
    } else {
      stdout.write(result.css)
    }

    if (values.report) {
      const full = command === 'full' ? result : await buildCss({ ...options, full: true })
      const saved = full.gzip ? Math.round((1 - result.gzip / full.gzip) * 100) : 0
      say('')
      if (command === 'build') say(`  scanned   ${result.files.length} file(s)`)
      say(`  modules   ${result.included.length} shipped, ${result.excluded.length} shaken`)
      for (const m of result.included) say(`    + ${m.id.padEnd(12)} ${m.reason}`)
      for (const id of result.excluded) say(`    - ${id}`)
      say(`  size      ${kb(result.bytes)} (${kb(result.gzip)} gzip)`)
      if (command === 'build') say(`  full      ${kb(full.bytes)} (${kb(full.gzip)} gzip) → ${saved}% smaller`)
    }
    return 0
  } catch (error) {
    say(`blue-css: ${error.message}`)
    return 1
  }
}

/** `blue-css doctor` */
async function doctor(targets, values, { cwd, stdout, say }) {
  if (!targets.length) {
    say('blue-css doctor: pass at least one URL, build directory or HTML file.')
    return 2
  }
  const number = (name, fallback) => {
    const v = values[name] === undefined ? fallback : Number(values[name])
    if (!Number.isInteger(v) || v < 0) throw new Error(`--${name} must be a non-negative integer`)
    return v
  }
  try {
    const config = await loadConfig({ cwd, file: values.config })
    const manifests = await loadManifests(
      [...(config.presets ?? []), ...(values.preset ?? [])],
      config.configFile ? dirname(config.configFile) : cwd,
    )
    const report = await runDoctor({
      targets,
      manifests,
      cwd,
      crawl: values.crawl ?? false,
      maxPages: number('max-pages', 50),
      wait: number('wait', 0),
      root: values.root,
      onPage: values.json ? undefined : (p) => say(`  ${p.error ? '✗' : p.missing?.length ? '!' : '·'} ${p.url}`),
    })
    if (values.json) stdout.write(JSON.stringify(report, null, 2) + '\n')
    else stdout.write(formatReport(report, { origin: new URL(report.pages[0]?.url ?? 'http://x').origin }) + '\n')
    return report.ok ? 0 : 1
  } catch (error) {
    say(`blue-css doctor: ${error.message}`)
    return 1
  }
}
