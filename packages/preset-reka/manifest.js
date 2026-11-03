/**
 * @blue-css/preset-reka
 *
 * Styles reka-ui primitives used without classes, from what reka renders:
 * data-state / data-side attributes, its data-reka-* markers and the CSS
 * variables it writes inline. Core already styles the ARIA parts (tabs,
 * menus, listboxes, switches, checkboxes, radios, slider thumbs, toggles,
 * toolbars, the dialog panel); this preset adds positioning, overlays,
 * animations and the parts with no ARIA semantics.
 *
 * Triggers are markers found in reka's bundled code, so a module ships only
 * when the app actually imports the component that renders it.
 */
import { fileURLToPath } from 'node:url'

export default {
  name: '@blue-css/preset-reka',
  dir: fileURLToPath(new URL('./src/', import.meta.url)),
  layers: ['presets'],
  modules: [
    { id: 'reka/motion', file: 'motion.css', layer: 'presets', scoped: false },
    {
      id: 'reka/collapsible',
      file: 'collapsible.css',
      layer: 'presets',
      triggers: ['text:--reka-collapsible-content-height'],
      deps: ['reka/motion'],
    },
    {
      id: 'reka/accordion',
      file: 'accordion.css',
      layer: 'presets',
      triggers: ['text:--reka-accordion-content-height'],
      deps: ['reka/motion'],
    },
    {
      id: 'reka/dialog',
      file: 'dialog.css',
      layer: 'presets',
      triggers: ['attr:role=dialog', 'attr:role=alertdialog'],
      deps: ['dialog', 'reka/motion'],
    },
    {
      id: 'reka/popper',
      file: 'popper.css',
      layer: 'presets',
      triggers: ['attr:data-reka-popper-content-wrapper'],
      deps: ['reka/motion'],
    },
    {
      id: 'reka/select',
      file: 'select.css',
      layer: 'presets',
      triggers: ['attr:data-reka-select-viewport'],
      deps: ['forms', 'menu'],
    },
    {
      id: 'reka/combobox',
      file: 'combobox.css',
      layer: 'presets',
      triggers: ['attr:data-reka-combobox-viewport'],
      deps: ['forms', 'menu'],
    },
    { id: 'reka/slider', file: 'slider.css', layer: 'presets', triggers: ['attr:data-slider-impl'], deps: ['toggles'] },
    {
      id: 'reka/toast',
      file: 'toast.css',
      layer: 'presets',
      triggers: ['attr:data-swipe-direction', 'attr:data-reka-toast-announce-exclude'],
      deps: ['button', 'reka/motion'],
    },
    { id: 'reka/avatar', file: 'avatar.css', layer: 'presets', triggers: ['attr:role=img'] },
    {
      id: 'reka/scroll-area',
      file: 'scroll-area.css',
      layer: 'presets',
      triggers: ['attr:data-reka-scroll-area-viewport'],
    },
  ],
}
