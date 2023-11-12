import type { PageLoad } from './$types'

export const load: PageLoad = async ({ params, url }) => {
  const { id } = params
  const { searchParams } = url
  const walletId = searchParams.get('wallet')
  return { id, walletId }
}
