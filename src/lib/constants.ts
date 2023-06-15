import {
  BitcoinDenomination,
  FiatDenomination,
  Language,
  type Settings
} from './@types/settings.js'
import bitcoin from './icons/bitcoin'
import lightningIcon from './icons/lightning'

export const DEV = import.meta.env.DEV
export const MODE = import.meta.env.MODE

export const API_HOST = 'api.clams.tech'
export const API_URL = `https://${API_HOST}`
export const WS_PROXY = `wss://${API_HOST}/ws-proxy`

export const SEC_IN_MS = 1000
export const MIN_IN_MS = 60 * 1000
export const MIN_IN_SECS = 60

export const DEFAULT_INVOICE_EXPIRY = 60 * MIN_IN_SECS

export const DEFAULT_SETTINGS: Settings = {
  language: (typeof window === 'undefined'
    ? Language['en-US']
    : navigator?.languages
    ? navigator.languages[0]
    : navigator.language) as Language,
  fiatDenomination: FiatDenomination.usd,
  bitcoinDenomination: BitcoinDenomination.sats,
  primaryDenomination: BitcoinDenomination.sats,
  secondaryDenomination: FiatDenomination.usd,
  invoiceExpiry: DEFAULT_INVOICE_EXPIRY,
  sendMaxFeePercent: 0.5,
  sendTimeoutSeconds: 120,
  notifications: true
}

export const SUPPORTED_LOCALES = ['en-US', 'en-GB']
export const DOCS_LINK = 'https://docs.clams.tech'
export const TWITTER_LINK = 'https://twitter.com/clamstech'
export const GITHUB_LINK = 'https://github.com/clams-tech'
export const DISCORD_LINK = 'https://discord.gg/eWfHuJZVaB'
export const TRANSLATE_LINK = 'https://github.com/clams-tech/browser-app#contributing'

export const currencySymbols = {
  btc: bitcoin,
  sats: lightningIcon,
  msats: lightningIcon,
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
