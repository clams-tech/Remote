import type { FiatDenomination } from './settings.js'

export type ExchangeRate = {
  timestamp: number
  currency: FiatDenomination
  price: number
}
