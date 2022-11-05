import { goto } from '$app/navigation'
import { AUTH_STORAGE_KEY } from '$lib/constants'
import { auth$ } from '$lib/streams'
import type { Auth } from '$lib/types'
import { getDataFromStorage, isProtectedRoute } from '$lib/utils'
import type { LayoutLoad } from './$types'

export const ssr = false
export const prerender = true

export const load: LayoutLoad = async ({ url }) => {
  const { pathname } = url
  const protectedRoute = isProtectedRoute(pathname)
  const inMemoryAuth = auth$.getValue()

  if (inMemoryAuth) {
    // already have auth and not protected route, so redirect home
    !isProtectedRoute && goto('/')
    return
  }

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
