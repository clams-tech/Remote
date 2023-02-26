import type { ParsedOffChainString, ParsedOnchainString } from '$lib/types'
import { parseBitcoinUrl } from '$lib/utils'
import type { PageLoad } from './$types'

export const load: PageLoad = async ({ url }) => {
  const destination = url.searchParams.get('destination')

  if (destination) {
    const { value, type } = parseBitcoinUrl(destination) as
      | ParsedOffChainString
      | ParsedOnchainString

    return {
      destination: type === 'onchain' ? (value as ParsedOnchainString['value']).address : value,
      type
    }
  }
}
