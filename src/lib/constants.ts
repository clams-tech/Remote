import { FiatDenomination, type Language, type Settings, type Tile } from './@types/settings.js'
import channels from '$lib/icons/channels.js'
import keys from '$lib/icons/keys.js'
import lightningOutline from '$lib/icons/lightning-outline.js'
import list from '$lib/icons/list.js'
import settingsOutline from '$lib/icons/settings-outline.js'
import wallet from '$lib/icons/wallet.js'
import forward from '$lib/icons/forward.js'
import type { Network } from './@types/payments.js'

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

export const TILES: Record<Tile, boolean> = {
  wallets: true,
  payments: true,
  utxos: true,
  channels: true,
  offers: true,
  forwards: true,
  // accounting: true,
  // charts: true,
  // trades: true,
  settings: true
}

export const TILE_ICONS: Record<Tile, string> = {
  wallets: wallet,
  payments: list,
  utxos: keys,
  channels: channels,
  offers: lightningOutline,
  forwards: forward,
  // trades: trade,
  // accounting: feeOutline,
  // charts: graph,
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
  tiles: TILES,
  lavaLamp: true
}

export const SUPPORTED_LANGUAGES = ['en', 'en-AU', 'en-GB', 'en-US']
export const DOCS_LINK = 'https://docs.clams.tech/remote'
export const TWITTER_LINK = 'https://twitter.com/clamstech'
export const GITHUB_LINK = 'https://github.com/clams-tech'
export const DISCORD_LINK = 'https://discord.gg/eWfHuJZVaB'
export const TRANSLATE_LINK = 'https://github.com/clams-tech/remote#contributing'

export const LARP_MODE_PASSPHRASE = 'larp'

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
  rub: '₽',
  none: '₿'
}

const STORAGE_VERSION = 1

export const STORAGE_KEYS: Record<string, string> = {
  session: `clams:session:${STORAGE_VERSION}`,
  settings: `clams:settings:${STORAGE_VERSION}`,
  lastReceiveWallet: `clams:last_receive_wallet:${STORAGE_VERSION}`,
  lastSendWallet: `clams:last_send_wallet:${STORAGE_VERSION}`,
  // whether has dismissed the get started hint
  getStartedHint: `clams:get_started_hint:${STORAGE_VERSION}`,
  larpMode: `clams:larp_mode:${STORAGE_VERSION}`
}

export const FILTER_STORAGE_KEYS: Record<string, Record<string, string>> = {
  // saved filters
  filters: {
    payments: `clams:filters:payments:${STORAGE_VERSION}`,
    forwards: `clams:filters:forwards:${STORAGE_VERSION}`,
    channels: `clams:filters:channels:${STORAGE_VERSION}`,
    offers: `clams:filters:offers:${STORAGE_VERSION}`,
    utxos: `clams:filters:utxos:${STORAGE_VERSION}`,
    wallets: `clams:filters:wallets:${STORAGE_VERSION}`
  },
  // saved sorter
  sorter: {
    payments: `clams:sorter:payments:${STORAGE_VERSION}`,
    forwards: `clams:sorter:forwards:${STORAGE_VERSION}`,
    channels: `clams:sorter:channels:${STORAGE_VERSION}`,
    offers: `clams:sorter:offers:${STORAGE_VERSION}`,
    utxos: `clams:sorter:utxos:${STORAGE_VERSION}`,
    wallets: `clams:sorter:wallets:${STORAGE_VERSION}`
  },
  // saved tag filters
  tags: {
    payments: `clams:tags:payments:${STORAGE_VERSION}`,
    forwards: `clams:tags:forwards:${STORAGE_VERSION}`,
    channels: `clams:tags:channels:${STORAGE_VERSION}`,
    offers: `clams:tags:offers:${STORAGE_VERSION}`,
    utxos: `clams:tags:utxos:${STORAGE_VERSION}`,
    wallets: `clams:tags:wallets:${STORAGE_VERSION}`
  }
}

export const TLV_RECORDS = {
  message: 34349334
}

export const GENESIS_HASHES: Record<string, Network> = {
  '00000008819873e925422c1ff0f99f7cc9bbb232af63a077a480a3633bee1ef6': 'signet',
  '06226e46111a0b59caaf126043eb5bbf28c34f3a5e332a1fc7b2b73cf188910f': 'regtest',
  '000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f': 'bitcoin',
  '000000000933ea01ad0ee984209779baaec3ced90fa3f408719526f8d77f4943': 'testnet'
}
