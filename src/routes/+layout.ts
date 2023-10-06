import type { LayoutLoad } from './$types'
import { locale, loadTranslations } from '$lib/i18n/translations'
import { autoConnectWallet$, session$ } from '$lib/streams.js'
import { goto } from '$app/navigation'
import { browser } from '$app/environment'
import { routeRequiresSession } from '$lib/utils.js'
import { db } from '$lib/db/index.js'
import { log, storage } from '$lib/services.js'
import { STORAGE_KEYS } from '$lib/constants.js'
import type { WalletType } from '$lib/@types/wallets.js'

export const prerender = true
export const ssr = false

export const load: LayoutLoad = async ({ url }) => {
  /** LOAD TRANSLATIONS */
  const defaultLocale = 'en'
  const initLocale = locale.get() || defaultLocale
  await loadTranslations(initLocale)

  if (browser) {
    await db.open()
    const { pathname, searchParams } = url

    console.log({ pathname, searchParams })

    if (pathname === '/wallets/add') {
      const configurationStr = searchParams.get('configuration')
      const type = searchParams.get('type') as WalletType

      if (configurationStr && type) {
        try {
          const configuration = JSON.parse(configurationStr)
          const label = searchParams.get('label') as string
          autoConnectWallet$.next({ label, type, configuration })
        } catch (error) {
          log.error('Could not parse configuration search parameter for auto connection')
        }
      }
    }

    // no session in memory, so check stored session
    if (!session$.value) {
      let storedSession: string | null

      try {
        storedSession = storage.get(STORAGE_KEYS.session)
      } catch (error) {
        storedSession = null
      }

      // if no stored session, then we welcome to create a new session
      if (!storedSession && pathname !== '/welcome') {
        goto('/welcome')
      }
    } else if (!routeRequiresSession(pathname)) {
      // we have a session in memory but they are trying to view a non protected route like welcome
      // so redirect to home
      goto('/')
    }
  }
}
