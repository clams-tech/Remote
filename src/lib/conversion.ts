import Big from 'big.js'
import type { FiatDenomination } from './@types/settings.js'
import { bitcoinExchangeRates$ } from './streams'

Big.NE = -21
Big.DP = 8

export const satsToBtc = (sats: number): number => {
  return sats / 1e8
}

export const satsToBtcString = (sats: number): string => {
  return (sats / 1e8).toFixed(8)
}

export const btcToSats = (btc: number): number => btc * 1e8

export const satsToFiat = (sats: number, denomination: FiatDenomination): number | null => {
  const exchangeRate = getExchangeRate(denomination)

  return exchangeRate ? exchangeRate * satsToBtc(sats) : null
}

export const msatsToSats = (msats: string): number => Big(msats).div(1000).toNumber()
export const satsToMsats = (sats: number): string => Big(sats).times(1000).toString()

export function getExchangeRate(denomination: FiatDenomination): number | undefined {
  return bitcoinExchangeRates$.value?.[denomination]
}
