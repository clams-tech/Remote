import { browser } from '$app/environment'
import { goto } from '$app/navigation'
import { AUTH_STORAGE_KEY } from '$lib/constants'
import { auth$ } from '$lib/streams'
import type { Auth } from '$lib/types'
import { getDataFromStorage, isProtectedRoute } from '$lib/utils'
import type { LayoutLoad } from './$types'

export const ssr = false

/** 3 possiblities:
 * 1. First time to the app (nothing in memory or storage), need to redirect to welcome route
 * 2. Loading the app up, there is no passphrase in memory, need to redirect to decrypt route
 *  2a. Need to lookup the credentials in the db and check if they are encrypted, if not, then need to redirect to the encrypt route
 *    this is for users that have not already encrypted their credentials which we are now enforcing
 * 3. Navigating around the app, just need to redirect if going to a non protected route (welcome, connect)
 */

export const load: LayoutLoad = async ({ url }) => {
  if (!browser) return

  const { pathname } = url
  const protectedRoute = isProtectedRoute(pathname)
  // @TODO switch to authenticated$ observable
  const inMemoryAuth = auth$.getValue()

  if (inMemoryAuth) {
    // already have auth and not protected route, so redirect home
    !isProtectedRoute && goto('/')
    return
  }

  // @TODO get auth from db
  const storedAuth = getDataFromStorage(AUTH_STORAGE_KEY)

  if (storedAuth && !protectedRoute) {
    // redirect from welcome and connect -> home page if has connected before
    await goto('/')
  }

  if (!storedAuth && protectedRoute) {
    // tried to load a protected route and has not connected before
    await goto('/welcome')
  }

  let auth: Auth | null = null

  if (storedAuth && pathname !== '/decrypt') {
    try {
      auth = JSON.parse(storedAuth)
    } catch (error) {
      // encrypted auth, so route to decrypt
      await goto('/decrypt')
    }
  }

  if (auth) {
    auth$.next(auth)
  }
}
