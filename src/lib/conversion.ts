import Big from 'big.js'
import type { FiatDenomination } from './@types/settings.js'
import { bitcoinExchangeRates$ } from './streams'

Big.NE = -21
Big.DP = 8

export function msatsToBtc(msats: string): string {
  return Big(msats === 'any' ? '0' : msats)
    .div(1e11)
    .toString()
}

export function msatsToFiat(msats: string, denomination: FiatDenomination): string | null {
  const exchangeRate = getExchangeRate(denomination)

  return exchangeRate
    ? Big(exchangeRate)
        .times(msatsToBtc(msats === 'any' ? '0' : msats))
        .toString()
    : null
}

export function getExchangeRate(denomination: FiatDenomination): number | undefined {
  return bitcoinExchangeRates$.value?.[denomination]
}
