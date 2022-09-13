import { defineConfig } from 'vite'
import { sveltekit } from '@sveltejs/kit/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'

const file = fileURLToPath(new URL('package.json', import.meta.url))
const json = readFileSync(file, 'utf8')
const pkg = JSON.parse(json)

export default defineConfig(({ command }) => {
  const devPlugins = command === 'serve' ? [basicSsl()] : []

  const config = {
    plugins: [sveltekit(), ...devPlugins],
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version)
    }
  }

  return config
})
