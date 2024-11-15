import type { PageLoad } from './$types'

export const load: PageLoad = async ({ url }) => {
  if (typeof window !== 'undefined') {
    const address = url.searchParams.get('address')
    return { address }
  }
}
