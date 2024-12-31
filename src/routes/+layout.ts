import type { LayoutLoad } from './$types'
import { locale, loadTranslations } from '$lib/i18n/translations'
import { autoConnectWallet$, larpMode$, session$, settings$ } from '$lib/streams.js'
import { goto } from '$app/navigation'
import { browser } from '$app/environment'
import { routeRequiresSession } from '$lib/utils.js'
import { db } from '$lib/db/index.js'
import { log, storage } from '$lib/services.js'
import { LARP_MODE_PASSPHRASE, STORAGE_KEYS } from '$lib/constants.js'
import type { WalletConfiguration, WalletType } from '$lib/@types/wallets.js'
import { createNewSession } from '$lib/session.js'
import { decryptWithAES } from '$lib/crypto.js'
import type { Session } from '$lib/@types/session.js'

export const prerender = 'auto'
export const ssr = false

export const load: LayoutLoad = async ({ url }) => {
  /** LOAD TRANSLATIONS */
  const defaultLocale = 'en'
  const initLocale = settings$.value.language || locale.get() || defaultLocale
  const baseLocale = initLocale.split('-')[0]

  await loadTranslations(baseLocale)

  if (browser) {
    await db.open()

    const { pathname, searchParams } = url

    if (pathname === '/wallets/add') {
      const configurationStr = searchParams.get('configuration')
      const type = searchParams.get('type') as WalletType
      const larpMode = Boolean(searchParams.get('larp'))

      if (configurationStr && type) {
        try {
          const configuration = JSON.parse(configurationStr) as WalletConfiguration
          const label = searchParams.get('label') as string

          autoConnectWallet$.next({ configuration, label, type })
        } catch (error) {
          log.error('Could not parse configuration search parameter for auto connection')
          log.error(configurationStr)
        }
      }

      let currentStoredSession: string | null = null

      try {
        currentStoredSession = storage.get(STORAGE_KEYS.session)
      } catch (error) {
        //
      }

      if (larpMode === true && !currentStoredSession) {
        const { decrypted, encrypted } = await createNewSession(LARP_MODE_PASSPHRASE)

        try {
          storage.write(STORAGE_KEYS.larpMode, 'true')
          storage.write(STORAGE_KEYS.session, JSON.stringify(encrypted))
        } catch (error) {
          console.warn('No access to local storage to store larp mode')
        }

        larpMode$.next(true)
        session$.next(decrypted)

        await goto('/')
      }
    }

    // no session in memory, so check stored session and if stored larp mode
    if (!session$.value) {
      let storedSession: string | null

      try {
        storedSession = storage.get(STORAGE_KEYS.session)

        try {
          const larpMode = storage.get(STORAGE_KEYS.larpMode)

          if (larpMode === 'true' && storedSession) {
            const session = JSON.parse(storedSession) as Session
            const decryptedSecret = decryptWithAES(session.secret, LARP_MODE_PASSPHRASE)

            session$.next({ secret: decryptedSecret, id: session.id })
            larpMode$.next(true)
          }
        } catch (error) {
          console.error('Could not retrieve larp mode setting from storage')
        }
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
