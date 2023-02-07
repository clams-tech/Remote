import { parsePaymentInput } from '$lib/utils'
import type { PageLoad } from './$types'

export const load: PageLoad = async ({ url }) => {
  const destination = url.searchParams.get('destination')

  if (destination) {
    const { address, lightning, type } = parsePaymentInput(destination)

    return {
      destination: lightning || address,
      type
    }
  }
}
