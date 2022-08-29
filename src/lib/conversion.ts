import Big from 'big.js'
import { bitcoinExchangeRates$ } from './streams'
import { BitcoinDenomination, type Denomination, type FiatDenomination } from './types'

export function msatsToBtc(msats: string): string {
  return Big(msats === 'any' ? '0' : msats)
    .div(1e11)
    .toString()
}

export function msatsToSats(msats: string): string {
  return Big(msats === 'any' ? '0' : msats)
    .div(1000)
    .toString()
}

export function satsToBtc(sats: string): string {
  return Big(sats).div(1e8).toString()
}

export function satsToMsats(sats: string): string {
  return Big(sats).times(1000).toString()
}

export function btcToMsats(btc: string): string {
  return Big(btc).times(1e11).toString()
}

export function btcToSats(btc: string): number {
  return Big(btc).times(1e8).toNumber()
}

export function fiatToMsats({
  value,
  exchangeRate
}: {
  value: string
  exchangeRate: number
}): string | null {
  if (!exchangeRate) return null
  if (value === '0' || value === '0.' || value === '0.0' || value === '0.00') return value

  const btcValue = Big(1).div(Big(exchangeRate).div(value))

  return btcValue.times(1e11).round().toString()
}

export function msatsToFiat(msats: string, exchangeRate: number): string | null {
  if (!exchangeRate) return null

  return Big(exchangeRate)
    .times(msatsToBtc(msats === 'any' ? '0' : msats))
    .toString()
}

export function convertValue({
  value,
  from,
  to
}: {
  value: string | null
  from: Denomination
  to: Denomination
}): string | null {
  if (from === to) {
    return value
  }

  if (!value) return value

  switch (from) {
    case 'btc':
    case 'sats':
    case 'msats': {
      const valueMsats =
        from === 'msats' ? value : bitcoinDenominationToMsats({ denomination: from, value })

      return convertMsats({
        value: valueMsats,
        denomination: to
      })
    }

    default: {
      const exchangeRate = getExchangeRate(from as FiatDenomination)
      const valueMsats = exchangeRate ? fiatToMsats({ value, exchangeRate }) : null

      if (!valueMsats) return null

      return convertValue({ value: valueMsats, from: BitcoinDenomination.msats, to })
    }
  }
}

function bitcoinDenominationToMsats({
  value,
  denomination
}: {
  value: string
  denomination: string
}): string {
  switch (denomination) {
    case 'btc':
      return btcToMsats(value)
    case 'sats':
      return satsToMsats(value)
    default:
      return value
  }
}

function getExchangeRate(denomination: FiatDenomination): number | null {
  return bitcoinExchangeRates$.value && bitcoinExchangeRates$.value[denomination]
}

export function convertMsats({
  value,
  denomination
}: {
  value: string
  denomination: Denomination
}): string | null {
  switch (denomination) {
    case 'sats':
      return msatsToSats(value)

    case 'btc':
      return msatsToBtc(value)

    case 'msats':
      return value

    // all fiat denominations
    default: {
      const exchangeRate = getExchangeRate(denomination as FiatDenomination)
      return exchangeRate ? msatsToFiat(value, exchangeRate) : null
    }
  }
}

export function isBitcoinDenomination(denomination: Denomination): boolean {
  switch (denomination) {
    case 'btc':
    case 'sats':
    case 'msats': {
      return true
    }

    default: {
      return false
    }
  }
}
