import type { LayoutLoad } from './$types'
import { locale, loadTranslations } from '$lib/i18n/translations'

export const ssr = false

export const load: LayoutLoad = async ({ url }) => {
  const { pathname } = url
  const defaultLocale = 'en'
  const initLocale = locale.get() || defaultLocale

  await loadTranslations(initLocale, pathname)

  return {}
}
