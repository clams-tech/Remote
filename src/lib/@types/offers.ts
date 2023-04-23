import type { Bolt12Type } from '$lib/backends/index.js'
import type { BitcoinDenomination, FiatDenomination } from './settings.js'

export type Offer = {
  id: string
  bolt12: string
  used?: boolean
  type: Bolt12Type
  denomination: BitcoinDenomination.msats | FiatDenomination
  amount: string
  description: string
  nodeId: string
  singleUse?: boolean
  active?: boolean
  label?: string
  expiry?: number
  issuer?: string
  quantityMax?: number
}
