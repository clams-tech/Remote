import type { PageLoad } from './$types'

export const load: PageLoad = async ({ params, url }) => {
  const { address } = params
  const amount = url.searchParams.get('amount')
  const message = url.searchParams.get('message')
  const label = url.searchParams.get('label')
  return { address, amount, message, label }
}
