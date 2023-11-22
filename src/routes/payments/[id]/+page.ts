import type { PageLoad } from './$types'

export const load: PageLoad = async ({ params, url, depends }) => {
  const { id } = params
  const { searchParams } = url
  const walletId = searchParams.get('wallet')
  depends('payments:link')
  return { id, walletId }
}
