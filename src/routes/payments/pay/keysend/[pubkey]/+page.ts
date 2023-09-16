import type { PageLoad } from './$types'

export const load: PageLoad = async ({ params }) => {
  const { pubkey } = params
  return { pubkey }
}
