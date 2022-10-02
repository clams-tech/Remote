import { redirect } from '@sveltejs/kit'
import type { PageLoad } from './$types'
import { auth$ } from '$lib/streams'

export const load: PageLoad = ({ params }) => {
  if (!auth$.getValue().address) {
    throw redirect(302, '/welcome')
  } else {
    return { id: params.id }
  }
}
