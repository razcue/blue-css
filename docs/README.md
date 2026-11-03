# Blue CSS documentation site

A [Docus](https://docus.dev) 5 site (Nuxt Content + Nuxt UI) that documents
Blue CSS and uses it for every example.

- **Live recipes.** `::blue-example` blocks render their HTML with the real
  Blue stylesheet (core + reka-ui preset) inside an isolated iframe. Blue never
  styles the Docus page, and Tailwind never styles the preview.
- **Generated facts.** [`modules/blue-css.ts`](./modules/blue-css.ts) builds the
  stylesheet when the site builds and exposes real data to the pages: sizes,
  per-example tree-shaking results, every module with its triggers, and every
  token. The homepage meter and the Reference tables read it, so they cannot go
  stale.

## Local development

From the repository root:

```bash
pnpm install
pnpm docs:dev         # http://localhost:3000, hot reload
pnpm docs:generate    # static site in docs/.output/public, served from /
pnpm docs:pages       # the GitHub Pages build, served from /blue-css/
```

To preview the Pages build locally, serve its output under the same base path:

```bash
mkdir -p /tmp/pages && cp -r docs/.output/public /tmp/pages/blue-css
npx serve /tmp/pages    # then open http://localhost:3000/blue-css/
```

Changes to `packages/core`, `packages/engine`, `packages/preset-reka` or
`examples/` change the site too: restart `docs:dev` to rebuild the stylesheet
and the facts.

## Deploying to GitHub Pages

[`.github/workflows/pages.yml`](../.github/workflows/pages.yml) builds the site
and publishes it to GitHub Pages.

### One-time setup

1. **Enable Pages from Actions.** In the repository, open **Settings → Pages**.
   Under **Build and deployment → Source**, choose **GitHub Actions**.
2. **Make `master` the default branch.** The workflow deploys on pushes to
   `master`. Set it as the default branch in **Settings → General**.
3. **Allow the branch to deploy.** **Settings → Environments → github-pages**
   limits which branches may deploy. By default only the default branch can.
   Keep `master` allowed (it is, once it's the default branch).

The first deployment publishes the site at
`https://<owner>.github.io/<repository>/`, for this repository
<https://razcue.github.io/blue-css/>.

### When it runs

- **On push to `master`,** when anything that changes the site changes:
  `docs/`, `packages/`, `examples/`, the root `package.json`, the pnpm
  lockfile and workspace file, or the workflow itself.
- **On demand:** **Actions → pages → Run workflow** builds and deploys the
  selected branch, if the `github-pages` environment allows that branch.

Runs never overlap. A deployment in progress always finishes, and a newer
push replaces any run still waiting behind it.

### What it does

1. Installs the workspace with `pnpm install --frozen-lockfile`. The pnpm
   version comes from `packageManager` in the root `package.json`, and Node 22
   is used.
2. Runs the docs tests (`pnpm --filter blue-css-docs test`).
3. Runs `pnpm docs:pages`:
   - **`nuxt generate`** with `NUXT_APP_BASE_URL` set to the base path. Every
     content page is listed for prerendering by `modules/blue-css.ts`, because
     Nitro's crawler doesn't follow links that carry a base path.
   - **`scripts/site-base.mjs`** adds the base path to the URLs Docus writes
     without it: `llms.txt`, `llms-full.txt`, `sitemap.md`, canonical links
     and the favicon link.
4. Uploads `docs/.output/public` and deploys it.

If any step fails, nothing is published and the live site stays as it was.

### Custom domain or another base path

The site URL and base path come from two optional **repository variables**,
set in **Settings → Secrets and variables → Actions → Variables**:

| Variable | Default | Example for a custom domain |
|---|---|---|
| `DOCS_SITE_URL` | `https://<owner>.github.io` | `https://bluecss.dev` |
| `DOCS_BASE_URL` | `/<repository>/` | `/` |

For a custom domain:

1. Set `DOCS_SITE_URL` to the domain and `DOCS_BASE_URL` to `/`.
2. Add the domain under **Settings → Pages → Custom domain**, and create the
   DNS records GitHub shows there. No `CNAME` file is needed: Pages ignores it
   when deploying from Actions.

With `DOCS_BASE_URL=/`, `site-base.mjs` changes nothing and `robots.txt` is
generated, since it only makes sense at a domain root.

### Other hosts

Any static host works with the generated output:

```bash
NUXT_SITE_URL=https://docs.example.com pnpm docs:generate   # served from /
```

Publish `docs/.output/public`. To serve under a sub-path instead, run
`pnpm docs:pages` with `NUXT_APP_BASE_URL=/your-path/`.

On a host that runs Node (Vercel, Netlify, a container), `nuxt build`
(`pnpm --filter blue-css-docs build`) also serves Docus's server routes, such as
its MCP endpoint at `/mcp`. The static build has none.

### Troubleshooting

| Symptom | Cause and fix |
|---|---|
| Deploy job fails with *"Branch … is not allowed to deploy to github-pages"* | Allow the branch under **Settings → Environments → github-pages → Deployment branches**. |
| *"Get Pages site failed"* in `configure-pages` | Pages isn't enabled, or its source isn't **GitHub Actions** (setup step 1). |
| `pnpm install --frozen-lockfile` fails | `pnpm-lock.yaml` is out of date. Run `pnpm install` locally and commit the lockfile. |
| The homepage works but other pages are 404 | A page wasn't prerendered. Content pages are listed automatically from `content/`. A page outside it needs adding to `nitro.prerender.routes` in `nuxt.config.ts`. |
| Pages load without styles, or assets 404 | The base path doesn't match where the site is served. Check `DOCS_BASE_URL`: it needs a leading and a trailing slash. |
| Live previews are unstyled | The previews load `<base>blue-css/blue.css`. Check that file exists in `docs/.output/public/blue-css/`. |
| Warnings about Google Fonts or other font providers during the build | Harmless. They only appear where the network blocks those hosts, and fonts fall back to the system stack. |
