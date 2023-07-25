import { formatDistanceToNowStrict, formatRelative } from 'date-fns'
import { settings$ } from './streams.js'

// https://github.com/date-fns/date-fns/blob/9bb51691f201c3ec05ab832acbc5d478f2e5c47a/docs/i18nLocales.md
const locales: Record<string, () => Promise<Locale>> = {
  'en-GB': () => import('date-fns/esm/locale/en-GB/index.js').then((mod) => mod.default), // British English
  'en-US': () => import('date-fns/esm/locale/en-US/index.js').then((mod) => mod.default), // American English
  'zh-CN': () => import('date-fns/esm/locale/zh-CN/index.js').then((mod) => mod.default), // Chinese (mainland)
  es: () => import('date-fns/esm/locale/es/index.js').then((mod) => mod.default), // Spanish
  hi: () => import('date-fns/esm/locale/hi/index.js').then((mod) => mod.default), // Hindi
  ar: () => import('date-fns/esm/locale/ar/index.js').then((mod) => mod.default), // Arabic
  bn: () => import('date-fns/esm/locale/bn/index.js').then((mod) => mod.default), // Bengali
  fr: () => import('date-fns/esm/locale/fr/index.js').then((mod) => mod.default), // French
  pt: () => import('date-fns/esm/locale/pt/index.js').then((mod) => mod.default), // Portuguese
  ru: () => import('date-fns/esm/locale/ru/index.js').then((mod) => mod.default), // Russian
  ja: () => import('date-fns/esm/locale/ja/index.js').then((mod) => mod.default), // Japanese
  id: () => import('date-fns/esm/locale/id/index.js').then((mod) => mod.default), // Indonesian
  de: () => import('date-fns/esm/locale/de/index.js').then((mod) => mod.default), // German
  te: () => import('date-fns/esm/locale/te/index.js').then((mod) => mod.default), // Telugu
  tr: () => import('date-fns/esm/locale/tr/index.js').then((mod) => mod.default), // Turkish
  ta: () => import('date-fns/esm/locale/ta/index.js').then((mod) => mod.default), // Tamil
  ko: () => import('date-fns/esm/locale/ko/index.js').then((mod) => mod.default) // Korean
}

export async function formatDate(
  /** unix seconds */
  date: number
): Promise<string> {
  const { language } = settings$.value
  const locale = await (locales[language] || locales['en-GB'])()

  return formatRelative(new Date(date * 1000), new Date(), { locale })
}

export async function formatCountdown(options: { date: Date; language: string }): Promise<string> {
  const { date, language } = options

  const locale = await (locales[language] || locales['en-GB'])()

  return formatDistanceToNowStrict(date, { locale, addSuffix: true })
}
