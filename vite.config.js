import { createLogger, defineConfig } from 'vite'
import { sveltekit } from '@sveltejs/kit/vite'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill'
import rollupNodePolyFill from 'rollup-plugin-polyfill-node'

const file = fileURLToPath(new URL('package.json', import.meta.url))
const json = readFileSync(file, 'utf8')
const pkg = JSON.parse(json)

const logger = createLogger()
const loggerError = logger.error

logger.error = (msg, options) => {
  // Ignore empty CSS files warning
  if (msg.includes('window is not defined')) return
  loggerError(msg, options)
}

export default ({ mode }) =>
  defineConfig({
    plugins: [sveltekit(), ...(mode === 'https' ? [basicSsl()] : [])],
    customLogger: logger,
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version)
    },
    build: {
      rollupOptions: {
        plugins: [rollupNodePolyFill()]
      },
      target: 'esnext'
    },
    optimizeDeps: {
      esbuildOptions: {
        // Node.js global to browser globalThis
        define: {
          global: 'globalThis'
        },
        // Enable esbuild polyfill plugins
        plugins: [
          NodeGlobalsPolyfillPlugin({
            buffer: true
          })
        ],
        supported: {
          bigint: true
        }
      }
    }
  })
