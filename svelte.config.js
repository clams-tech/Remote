import adapter from '@sveltejs/adapter-static'
import { vitePreprocess } from '@sveltejs/kit/vite'

const dev = process.env.NODE_ENV === 'development'

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Consult https://github.com/sveltejs/svelte-preprocess
  // for more information about preprocessors
  preprocess: vitePreprocess(),

  kit: {
    adapter: adapter({
      fallback: '200.html'
    }),
    paths: {
      base: dev ? '' : '/Remote' // Use '/Remote' for GitHub Pages
    },
    csp: {
      mode: 'auto',
      directives: {
        'script-src': ['self', 'unsafe-inline'],
        'object-src': ['self']
      },
      reportOnly: {
        'script-src': ['self', 'unsafe-eval'],
        'report-to': ['self'],
        'report-uri': ['self'],
        'object-src': ['self']
      }
    },
    csrf: {
      checkOrigin: true
    }
  }
}

export default config
