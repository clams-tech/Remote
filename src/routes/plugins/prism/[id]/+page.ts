import type { PageLoad } from './$types'

export const load: PageLoad = async ({ params: { id }, url }) => {
  const { searchParams } = url
  const wallet = searchParams.get('wallet')

  return { id, wallet }
}
