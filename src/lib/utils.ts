import decode from 'bolt12-decoder'
import type { BitcoinExchangeRates, FiatDenomination, Settings, Tile } from './@types/settings.js'
import { API_URL, GENESIS_HASHES } from './constants.js'
import { log } from './services.js'
import { Buffer } from 'buffer'
import type { Network } from './@types/common.js'

/** return unix timestamp in seconds for now  */
export function nowSeconds() {
  return Math.round(Date.now() / 1000)
}

export function routeRequiresSession(path: string): boolean {
  switch (path) {
    case '/welcome':
      return false
    default:
      return true
  }
}

export function truncateValue(val: string, length = 8, elipsisPosition = 'center'): string {
  return val.length <= length * 2
    ? val
    : elipsisPosition === 'center'
    ? `${val.slice(0, length)}...${val.slice(-length)}`
    : `${val.slice(0, length * 2)}...`
}

export function simpleDeepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

export const noop = () => {}

export const wait = (time: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, time))

export async function getBitcoinExchangeRate(
  currency: FiatDenomination
): Promise<BitcoinExchangeRates | null> {
  if (currency === 'none') {
    return null
  }

  try {
    const result = await fetch(`${API_URL}/exchange-rates?currency=${currency}`).then((res) =>
      res.json()
    )
    return result
  } catch (error) {
    log.warn(`Could not get exchange rate for currency: ${currency} `)
    return null
  }
}

export function isDesktop() {
  if (
    navigator.userAgent.match(/Android/i) ||
    navigator.userAgent.match(/webOS/i) ||
    navigator.userAgent.match(/iPhone/i) ||
    navigator.userAgent.match(/iPad/i) ||
    navigator.userAgent.match(/iPod/i) ||
    navigator.userAgent.match(/BlackBerry/i) ||
    navigator.userAgent.match(/Windows Phone/i)
  ) {
    return false
  } else {
    return true
  }
}

export const stringToHex = (val: string): string => Buffer.from(val).toString('hex')

type Valuable<T> = { [K in keyof T as T[K] extends null | undefined ? never : K]: T[K] }

export function stripUndefined<
  // eslint-disable-next-line @typescript-eslint/ban-types
  T extends {},
  V = Valuable<T>
>(obj: T): V {
  return Object.fromEntries(
    Object.entries(obj).filter(
      ([, v]) => !((typeof v === 'string' && !v.length) || v === null || typeof v === 'undefined')
    )
  ) as V
}

export function firstLetterUpperCase(str: string): string {
  return `${str.slice(0, 1).toUpperCase()}${str.slice(1)}`
}

export function mainDomain(host: string): string {
  return host.split('.').reverse().splice(0, 2).reverse().join('.')
}

export const getNetwork = (str: string): Network => {
  if (str.startsWith('lnbcrt') || str.startsWith('bcrt')) {
    return 'regtest'
  }

  if (str.startsWith('lntb') || str.startsWith('tb')) {
    return 'testnet'
  }

  if (str.startsWith('lntbs') || str.startsWith('tbs')) {
    return 'signet'
  }

  if (str.startsWith('lno' || str.startsWith('lni') || str.startsWith('lno'))) {
    const { offer_chains } = decode(str)
    if (offer_chains && offer_chains.length) {
      const network = GENESIS_HASHES[offer_chains[0]]
      if (network) return network
    }
  }

  return 'bitcoin'
}

export const mergeDefaultsWithStoredSettings = (
  defaults: Settings,
  stored: string | null
): Settings => {
  const { tiles } = defaults
  const storedSettings: Settings = stored ? JSON.parse(stored) : {}

  const mergedTiles = Object.keys(tiles).reduce((merged, key) => {
    const val = (
      storedSettings.tiles && typeof storedSettings.tiles[key as Tile] === 'boolean'
        ? storedSettings.tiles[key as Tile]
        : tiles[key as Tile]
    ) as boolean
    merged[key as Tile] = val

    return merged
  }, {} as Record<Tile, boolean>)

  return {
    ...defaults,
    ...storedSettings,
    tiles: mergedTiles
  }
}
