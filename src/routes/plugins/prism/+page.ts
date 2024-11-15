import type { PageLoad } from './$types'

export const load: PageLoad = async ({ url }) => {
  if (typeof window !== 'undefined') {
    const { searchParams } = url
    const wallet = searchParams.get('wallet')

    return { wallet }
  }
}
