import { redirect } from '@sveltejs/kit'
import type { PageLoad } from './$types'
import { credentials$ } from '$lib/streams'

export const load: PageLoad = async () => {
  const { connection, rune } = credentials$.getValue()

  if (connection && rune) {
    throw redirect(302, '/')
  }
}
