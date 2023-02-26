import type { PageLoad } from './$types'
import { redirect } from '@sveltejs/kit'

export const load: PageLoad = async ({ url }) => {
  const bolt12 = url.searchParams.get('bolt12')

  if (!bolt12) throw redirect(307, '/')

  return {
    bolt12
  }
}
