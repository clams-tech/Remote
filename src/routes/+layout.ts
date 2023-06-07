import type { LayoutLoad } from './$types'
import { locale, loadTranslations } from '$lib/i18n/translations'
import { checkedSession$, session$ } from '$lib/streams.js'
import { getSession } from '$lib/storage.js'
import { goto } from '$app/navigation'
import { browser } from '$app/environment'
import { routeRequiresSession } from '$lib/utils.js'
import { db } from '$lib/db.js'

// delayed boolean set
function setCheckedSession() {
  setTimeout(() => checkedSession$.next(true), 20)
}

export const load: LayoutLoad = async ({ url }) => {
  /** LOAD TRANSLATIONS */
  const defaultLocale = 'en'
  const initLocale = locale.get() || defaultLocale
  await loadTranslations(initLocale)

  if (browser) {
    await db.open()
    const { pathname } = url

    // no session in memory, so check stored session
    // if (!session$.value) {
    //   const storedSession = getSession()

    //   if (!storedSession) {
    //     // if no stored session, then we welcome to create a new session
    //     if (pathname !== '/welcome') {
    //       goto('/welcome').then(setCheckedSession)
    //     } else {
    //       setCheckedSession()
    //     }
    //   } else {
    //     // otherwise we need to decrypt the session with a passphrase from the user
    //     if (pathname !== '/decrypt') {
    //       goto('/decrypt').then(setCheckedSession)
    //     } else {
    //       setCheckedSession()
    //     }
    //   }
    // } else if (!routeRequiresSession(pathname)) {
    // we have a session in memory but they are trying to view a non protected route like welcome
    // so redirect to home
    // goto('/').then(setCheckedSession)
    // } else {
    setCheckedSession()
    // }
  }
}
