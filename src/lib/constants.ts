import { FiatDenomination, type Language, type Settings, type Tile } from './@types/settings.js'
import channels from '$lib/icons/channels.js'
import feeOutline from '$lib/icons/fee-outline.js'
import graph from '$lib/icons/graph.js'
import keys from '$lib/icons/keys.js'
import lightningOutline from '$lib/icons/lightning-outline.js'
import list from '$lib/icons/list.js'
import settingsOutline from '$lib/icons/settings-outline.js'
import wallet from '$lib/icons/wallet.js'
import trade from '$lib/icons/trade.js'
import forward from '$lib/icons/forward.js'

export const DEV = import.meta.env.DEV
export const MODE = import.meta.env.MODE

export const API_HOST = 'api.clams.tech'
export const API_URL = `https://${API_HOST}`
export const WS_PROXY = `wss://${API_HOST}/ws-proxy`

export const SEC_IN_MS = 1000
export const MIN_IN_MS = 60 * 1000

export const MIN_IN_SECS = 60
export const HOUR_IN_SECS = 60 * MIN_IN_SECS
export const DAY_IN_SECS = 24 * HOUR_IN_SECS
export const WEEK_IN_SECS = 7 * DAY_IN_SECS

export const DEFAULT_INVOICE_EXPIRY = 60 * MIN_IN_SECS

export const TILES: Tile[] = [
  'wallets',
  'transactions',
  'utxos',
  'channels',
  'offers',
  'forwards',
  'accounting',
  'charts',
  'trades',
  'settings'
]

export const TILE_ICONS: Record<Tile, string> = {
  wallets: wallet,
  transactions: list,
  utxos: keys,
  channels: channels,
  offers: lightningOutline,
  forwards: forward,
  accounting: feeOutline,
  charts: graph,
  trades: trade,
  settings: settingsOutline
}

export const ALL_LANGUAGES: Language[] = [
  'en',
  'en-AU',
  'en-US',
  'en-GB',
  'zh-CN',
  'es',
  'hi',
  'ar',
  'bn',
  'fr',
  'pt',
  'ru',
  'ja',
  'id',
  'de',
  'te',
  'tr',
  'ta',
  'ko'
]

export const DEFAULT_SETTINGS: Settings = {
  language: (typeof window === 'undefined'
    ? 'en-US'
    : navigator?.languages
    ? navigator.languages[0]
    : navigator.language) as Language,
  fiatDenomination: FiatDenomination.usd,
  notifications: false,
  tiles: TILES
}

export const SUPPORTED_LANGUAGES = ['en', 'en-AU', 'en-GB', 'en-US']
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
  lastReceiveWallet: `clams:last_receive_wallet:${STORAGE_VERSION}`,
  lastSendWallet: `clams:last_send_wallet:${STORAGE_VERSION}`,
  getStartedHint: `clams:get_started_hint:${STORAGE_VERSION}`
}

export const TLV_RECORDS = {
  message: 34349334
}
