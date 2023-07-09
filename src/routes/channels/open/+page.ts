import type { PageLoad } from './$types'

export const load: PageLoad = async ({ url }) => {
  const address = url.searchParams.get('address')
  return { address }
}
