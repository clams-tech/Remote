import type { PageLoad } from './$types'

export const load: PageLoad = async ({ url }) => {
  const address = url.searchParams.get('address') // nodeId@hostname:port
  const rune = url.searchParams.get('rune') // admin rune
  const type = url.searchParams.get('type') // direct | proxy
  const value = url.searchParams.get('value') // proxyUrl | wss:

  return {
    address,
    rune,
    type,
    value
  }
}
