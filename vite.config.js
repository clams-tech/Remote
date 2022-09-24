import { sveltekit } from '@sveltejs/kit/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import nodePolyfills from 'vite-plugin-node-stdlib-browser'

const file = fileURLToPath(new URL('package.json', import.meta.url))
const json = readFileSync(file, 'utf8')
const pkg = JSON.parse(json)

/** @type {import('vite').UserConfig} */
export default {
  plugins: [sveltekit(), basicSsl(), nodePolyfills()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version)
  }
}
