import { getPaymentType, splitDestination } from '$lib/utils'
import type { PageLoad } from './$types'

export const load: PageLoad = async ({ url }) => {
  const destination = url.searchParams.get('destination')

  if (destination) {
    const strippedDestination = destination.includes('//')
      ? destination.replace('//', '')
      : destination

    const [prefix, formattedDestination] = splitDestination(strippedDestination)
    const type = getPaymentType(prefix, formattedDestination)

    return {
      destination: formattedDestination,
      type
    }
  }
}
