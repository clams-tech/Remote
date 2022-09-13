import { redirect } from '@sveltejs/kit'
import type { PageLoad } from './$types'
import { credentials$ } from '$lib/streams'

export const load: PageLoad = ({ params }) => {
  if (!credentials$.getValue().connection) {
    throw redirect(302, '/welcome')
  } else {
    return { id: params.id }
  }
}
