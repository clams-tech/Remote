import { FiatDenomination, Language, type Settings } from './@types/settings.js'

export const DEV = import.meta.env.DEV
export const MODE = import.meta.env.MODE

export const API_HOST = 'api.clams.tech'
export const API_URL = `https://${API_HOST}`
export const WS_PROXY = `wss://${API_HOST}/ws-proxy`

export const SEC_IN_MS = 1000
export const MIN_IN_MS = 60 * 1000
export const MIN_IN_SECS = 60
export const HOUR_IN_SECS = 60 * MIN_IN_MS
export const DAY_IN_SECS = 24 * HOUR_IN_SECS
export const WEEK_IN_SECS = 7 * DAY_IN_SECS

export const DEFAULT_INVOICE_EXPIRY = 60 * MIN_IN_SECS

export const DEFAULT_SETTINGS: Settings = {
  language: (typeof window === 'undefined'
    ? Language['en-US']
    : navigator?.languages
    ? navigator.languages[0]
    : navigator.language) as Language,
  fiatDenomination: FiatDenomination.usd
}

export const SUPPORTED_LOCALES = ['en-US']
export const DOCS_LINK = 'https://docs.clams.tech'
export const TWITTER_LINK = 'https://twitter.com/clamstech'
export const GITHUB_LINK = 'https://github.com/clams-tech'
export const DISCORD_LINK = 'https://discord.gg/eWfHuJZVaB'
export const TRANSLATE_LINK = 'https://github.com/clams-tech/browser-app#contributing'

export const CURRENCY_SYMBOLS = {
  usd: '$',
  eur: '€',
  gbp: '£',
  cny: '¥',
  jpy: '¥',
  cad: '$',
  aud: '$',
  hkd: '$',
  sgd: 'S$',
  sek: 'kr',
  chf: 'CHF',
  thb: '฿',
  pln: 'zł',
  nok: 'kr',
  myr: 'RM',
  dkk: 'kr',
  zar: 'R',
  nzd: '$',
  mxn: '$',
  rub: '₽'
}

const STORAGE_VERSION = 1

export const STORAGE_KEYS = {
  session: `clams:session:${STORAGE_VERSION}`,
  settings: `clams:settings:${STORAGE_VERSION}`,
  lastReceiveConnection: `clams:last_receive_connection:${STORAGE_VERSION}`,
  getStartedHint: `clams:get_started_hint:${STORAGE_VERSION}`
}
