import { parseBitcoinUrl } from '$lib/utils'
import type { PageLoad } from './$types'

export const load: PageLoad = async ({ url }) => {
  const destination = url.searchParams.get('destination')

  if (destination) {
    const { bolt11, lnurl, onchain, keysend, type } = parseBitcoinUrl(destination)

    return {
      destination: bolt11 || lnurl || keysend || onchain?.address,
      type
    }
  }
}
