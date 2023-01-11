import type { PageLoad } from './$types'
import { redirect } from '@sveltejs/kit'

export const load: PageLoad = async ({ url }) => {
  const lnurl = url.searchParams.get('lnurl')

  if (!lnurl) throw redirect(307, '/')

  return {
    lnurl
  }
}
