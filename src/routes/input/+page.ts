import type { PageLoad } from './$types'

export const load: PageLoad = async ({ url }) => {
  const value = url.searchParams.get('value')

  return {
    value
  }
}
