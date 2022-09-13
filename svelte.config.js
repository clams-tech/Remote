import adapter from '@sveltejs/adapter-static'
import preprocess from 'svelte-preprocess'

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Consult https://github.com/sveltejs/svelte-preprocess
  // for more information about preprocessors
  preprocess: preprocess(),

  kit: {
    adapter: adapter({
      fallback: '200.html'
    }),
    csp: {
      mode: 'hash',
      directives: {
        'script-src': [
          'self',
          'unsafe-eval' // needed for lnsocket script
        ]
      },
      reportOnly: {
        'script-src': ['self'],
        'report-to': ['self'],
        'report-uri': ['self']
      }
    },
    csrf: {
      checkOrigin: true
    }
  }
}

export default config
