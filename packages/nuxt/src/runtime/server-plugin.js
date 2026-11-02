// Nitro plugin: link the tree-shaken stylesheet from every rendered page.
import { fileName } from '#blue-css/stylesheet'
import { buildAssetsURL } from '#internal/nuxt/paths'

export default (nitroApp) => {
  if (!fileName) return
  nitroApp.hooks.hook('render:html', (html) => {
    // Resolved per request so runtime baseURL / cdnURL overrides are honoured.
    html.head.unshift(`<link rel="stylesheet" href="${buildAssetsURL(fileName)}">`)
  })
}
