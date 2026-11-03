/**
 * Blue CSS core manifest.
 *
 * Every CSS module declares the tokens that trigger it. The engine scans
 * built output for these tokens and ships only the modules that are used.
 *
 * Token forms:
 *   tag:<name>              an element, e.g. tag:dialog
 *   attr:<name>             an attribute with any value, e.g. attr:popover
 *   attr:<name>=<value>     an attribute with a literal value, e.g. attr:role=tab
 *
 * Module fields:
 *   id        unique id (also usable in `safelist`)
 *   file      path relative to `dir`
 *   layer     sub-layer of `blue` (see `layers`)
 *   always    always shipped
 *   scoped    wrapped in `@scope (:root) to ([data-blue="off"])` (default true)
 *   triggers  tokens that pull the module in
 *   deps      module ids that must ship with this one
 */
import { fileURLToPath } from 'node:url'

/** @type {import('@blue-css/engine').Manifest} */
export default {
  name: '@blue-css/core',
  dir: fileURLToPath(new URL('./src/', import.meta.url)),
  layers: ['tokens', 'reset', 'base', 'layout', 'components', 'roles', 'presets', 'containers'],
  modules: [
    { id: 'tokens', file: 'tokens.css', layer: 'tokens', always: true, scoped: false },
    { id: 'reset', file: 'reset.css', layer: 'reset', always: true, scoped: false },
    { id: 'base', file: 'base.css', layer: 'base', always: true },
    { id: 'motion', file: 'motion.css', layer: 'base', scoped: false },

    {
      id: 'code',
      file: 'code.css',
      layer: 'base',
      triggers: ['tag:pre', 'tag:code', 'tag:kbd', 'tag:samp'],
    },
    {
      id: 'layout',
      file: 'layout.css',
      layer: 'layout',
      triggers: ['tag:header', 'tag:footer', 'tag:main', 'tag:aside'],
    },
    {
      id: 'containers',
      file: 'containers.css',
      layer: 'containers',
      triggers: ['attr:data-layout'],
    },
    {
      id: 'nav',
      file: 'nav.css',
      layer: 'components',
      triggers: ['tag:nav', 'tag:menu'],
    },
    {
      id: 'button',
      file: 'button.css',
      layer: 'components',
      triggers: [
        'tag:button',
        'attr:role=button',
        'attr:type=submit',
        'attr:type=reset',
        'attr:type=button',
      ],
      deps: ['motion'],
    },
    {
      id: 'forms',
      file: 'forms.css',
      layer: 'components',
      triggers: [
        'tag:input',
        'tag:select',
        'tag:textarea',
        'tag:label',
        'tag:fieldset',
        'tag:search',
        'attr:role=group',
        'attr:role=combobox',
      ],
    },
    { id: 'table', file: 'table.css', layer: 'components', triggers: ['tag:table'] },
    { id: 'card', file: 'card.css', layer: 'components', triggers: ['tag:article'] },
    {
      id: 'dialog',
      file: 'dialog.css',
      layer: 'components',
      triggers: ['tag:dialog', 'attr:role=dialog', 'attr:role=alertdialog'],
      deps: ['motion'],
    },
    {
      id: 'popover',
      file: 'popover.css',
      layer: 'components',
      triggers: ['attr:popover', 'attr:role=tooltip'],
      deps: ['motion'],
    },
    {
      id: 'details',
      file: 'details.css',
      layer: 'components',
      triggers: ['tag:details', 'tag:summary'],
    },
    {
      id: 'alert',
      file: 'alert.css',
      layer: 'components',
      triggers: ['attr:role=alert', 'attr:role=status', 'attr:role=note'],
    },
    { id: 'badge', file: 'badge.css', layer: 'components', triggers: ['attr:data-badge'] },
    {
      id: 'feedback',
      file: 'feedback.css',
      layer: 'components',
      triggers: ['tag:progress', 'tag:meter', 'attr:aria-busy', 'attr:role=progressbar'],
      deps: ['motion'],
    },

    // ARIA widgets — styled by role, independent of the library that renders them.
    {
      id: 'tabs',
      file: 'roles/tabs.css',
      layer: 'roles',
      triggers: ['attr:role=tablist', 'attr:role=tab', 'attr:role=tabpanel'],
    },
    {
      id: 'menu',
      file: 'roles/menu.css',
      layer: 'roles',
      triggers: [
        'attr:role=menu',
        'attr:role=menubar',
        'attr:role=menuitem',
        'attr:role=menuitemcheckbox',
        'attr:role=menuitemradio',
        'attr:role=listbox',
        'attr:role=option',
      ],
      deps: ['motion'],
    },
    {
      id: 'toggles',
      file: 'roles/toggles.css',
      layer: 'roles',
      triggers: [
        'attr:role=switch',
        'attr:role=checkbox',
        'attr:role=radio',
        'attr:role=radiogroup',
        'attr:role=slider',
        'attr:aria-pressed',
      ],
    },
    {
      id: 'toolbar',
      file: 'roles/toolbar.css',
      layer: 'roles',
      triggers: ['attr:role=toolbar', 'attr:role=separator'],
    },
  ],
}
