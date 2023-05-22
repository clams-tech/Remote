import type { LayoutLoad } from './$types'
import { locale, loadTranslations } from '$lib/i18n/translations'

export const load: LayoutLoad = async () => {
  /** LOAD TRANSLATIONS */
  const defaultLocale = 'en'
  const initLocale = locale.get() || defaultLocale
  await loadTranslations(initLocale)
}
