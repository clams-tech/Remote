import type { PageLoad } from './$types'

export const load: PageLoad = async ({ url }) => {
  const { searchParams } = url
  const wallet = searchParams.get('wallet')

  return { wallet }
}
