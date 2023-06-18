import { defineConfig, createLogger } from 'vite'
import { sveltekit } from '@sveltejs/kit/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'

const file = fileURLToPath(new URL('package.json', import.meta.url))
const json = readFileSync(file, 'utf8')
const pkg = JSON.parse(json)

/** we need this to make hammerjs work correctly
 * https://github.com/sveltejs/kit/issues/9487
 */
const suppressWindowErrorPlugin = {
  name: 'unsafe-hide-ssr-error',
  configureServer(server) {
    const _ssrLoadModule = server.ssrLoadModule
    server.ssrLoadModule = function () {
      return _ssrLoadModule.apply(this, arguments).catch((e) => {
        if (e.message.includes('window is not defined')) {
          return {}
        }
        throw e
      })
    }
  }
}

const logger = createLogger()
const loggerError = logger.error

logger.error = (msg, options) => {
  // Ignore empty CSS files warning
  if (msg.includes('window is not defined')) return
  loggerError(msg, options)
}

export default ({ mode }) =>
  defineConfig({
    plugins: [sveltekit(), ...(mode !== 'http' ? [basicSsl()] : []), suppressWindowErrorPlugin],
    customLogger: logger,
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version)
    },
    build: {
      target: 'esnext'
    },
    optimizeDeps: {
      esbuildOptions: {
        supported: {
          bigint: true
        }
      }
    }
  })
