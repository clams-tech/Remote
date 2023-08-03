import { toOutputScript } from 'bitcoinjs-lib/src/address.js'
import type { BitcoinExchangeRates } from './@types/settings.js'
import { API_URL } from './constants.js'
import { bolt11Regex, hostRegex, nodePublicKeyRegex, usernameRegex } from './regex.js'
import { log } from './services.js'
import { settings$ } from './streams.js'

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

export function truncateValue(val: string, length = 9): string {
  return val.length <= length ? val : `${val.slice(0, length)}...${val.slice(-length)}`
}

export function simpleDeepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

export const noop = () => {}

export const wait = (time: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, time))

export async function getBitcoinExchangeRate(): Promise<BitcoinExchangeRates | null> {
  const currency = settings$.value.fiatDenomination

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
