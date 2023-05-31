import type { LayoutLoad } from './$types'
import { locale, loadTranslations } from '$lib/i18n/translations'
import { browser } from '$app/environment'
import { getSession } from '$lib/storage.js'
import { session$ } from '$lib/streams.js'
import { goto } from '$app/navigation'

export const load: LayoutLoad = async () => {
  /** LOAD TRANSLATIONS */
  const defaultLocale = 'en'
  const initLocale = locale.get() || defaultLocale
  await loadTranslations(initLocale)

  if (browser) {
    // if we have decrypted session in memory, no need to redirect
    if (session$.value) return

    const storedSession = getSession()

    if (!storedSession) {
      // if no stored session, then we start a fresh session
      goto('/welcome')
    } else {
      // otherwise we need to decrypt the session with a passphrase from the user
      goto('/decrypt')
    }
  }
}
