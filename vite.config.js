import { createLogger } from 'vite'
import { sveltekit } from '@sveltejs/kit/vite'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'

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

export default {
  plugins: [sveltekit()],
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
}
