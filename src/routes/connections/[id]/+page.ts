import { browser } from '$app/environment'
import { db } from '$lib/db.js'
import { connectionInterfaces$ } from '$lib/streams.js'
import { redirect } from '@sveltejs/kit'
import type { PageLoad } from './$types'

export const load: PageLoad = async ({ params }) => {
  const { id } = params

  if (browser) {
    const info = await db.connections.get(id)
    const connection = connectionInterfaces$.value.find((connection) => connection.id === id)

    if (info) {
      return { info, connection }
    } else {
      throw redirect(307, '/connections')
    }
  }
}
