import vue from '@vitejs/plugin-vue'
import blue from '@blue-css/vite'
import { defineConfig } from 'vite'
import reka from '../manifest.js'

export default defineConfig({
  plugins: [vue(), blue({ presets: [reka] })],
})
