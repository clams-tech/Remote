import type { PageLoad } from './$types'

export const load: PageLoad = async ({ url }) => {
  if (typeof window !== 'undefined') {
    const value = url.searchParams.get('value')

    return {
      value
    }
  }
}
