import type { PageLoad } from './$types'

export const load: PageLoad = async ({ url }) => {
  const { searchParams } = url
  const walletId = searchParams.get('wallet')

  return { walletId }
}
