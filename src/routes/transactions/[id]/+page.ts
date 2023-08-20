import type { PageLoad } from './$types'

export const load: PageLoad = async ({ params, url }) => {
  const { id } = params
  const connection = url.searchParams.get('connection')
  return { id, connection }
}
