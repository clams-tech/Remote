import Big from 'big.js'
import type { FiatDenomination } from './@types/settings.js'
import { bitcoinExchangeRates$ } from './streams'

Big.NE = -21
Big.DP = 8

export const msatsToBtc = (msats: string): string => {
  return Big(msats === 'any' ? '0' : msats)
    .div(1e11)
    .toFixed(8)
}

export const btcToSats = (btc: string): number => Big(btc).times(1e8).toNumber()

export const msatsToFiat = (msats: string, denomination: FiatDenomination): string | null => {
  const exchangeRate = getExchangeRate(denomination)

  return exchangeRate
    ? Big(exchangeRate)
        .times(msatsToBtc(msats === 'any' ? '0' : msats))
        .toString()
    : null
}

export const msatsToSats = (msats: string): number => Big(msats).div(1000).toNumber()

export const satsToMsats = (sats: number): string => Big(sats).times(1000).toString()

export function getExchangeRate(denomination: FiatDenomination): number | undefined {
  return bitcoinExchangeRates$.value?.[denomination]
}
