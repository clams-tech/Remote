import { redirect } from '@sveltejs/kit'
import type { PageLoad } from './$types'
import { checkDataIsStored } from '$lib/utils'
import { AUTH_STORAGE_KEY } from '$lib/constants'

export const load: PageLoad = ({ params }) => {
  const storedAuth = checkDataIsStored(AUTH_STORAGE_KEY)

  if (!storedAuth) {
    throw redirect(302, '/welcome')
  } else {
    return { id: params.id }
  }
}
