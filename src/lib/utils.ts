import decode from 'bolt12-decoder'
import type { BitcoinExchangeRates, FiatDenomination } from './@types/settings.js'
import { API_URL, GENESIS_HASHES } from './constants.js'
import { log } from './services.js'
import { Buffer } from 'buffer'
import type { Network } from './@types/payments.js'
import { db } from './db/index.js'
import type { Filter } from './@types/common.js'
import type { Node } from '$lib/@types/nodes.js'
import { nodePublicKeyRegex } from '$lib/address.js'
import { DAY_IN_SECS } from '$lib/constants.js'
import { connections$ } from '$lib/streams.js'
import type { CounterPart } from '$lib/summary.js'
import { combineLatest, filter, from, map, type Observable } from 'rxjs'
import { liveQuery } from 'dexie'

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
  new Promise(resolve => setTimeout(resolve, time))

export async function getBitcoinExchangeRate(
  currency: FiatDenomination
): Promise<BitcoinExchangeRates | null> {
  if (currency === 'none') {
    return null
  }

  try {
    const result = await fetch(`${API_URL}/exchange-rates?currency=${currency}`).then(res =>
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

export const getWalletBalance = (walletId: string): Observable<number> => {
  const channels$ = from(liveQuery(() => db.channels.where({ walletId }).toArray()))
  const utxos$ = from(liveQuery(() => db.utxos.where({ walletId }).toArray()))

  return combineLatest([channels$, utxos$]).pipe(
    filter(([channels, utxos]) => !!(channels && utxos)),
    map(([channels, utxos]) => {
      const channelsBalance = channels.reduce((total, channel) => {
        const { balanceLocal, status } = channel

        if (status === 'active' || status === 'opening') {
          total += balanceLocal
        }

        return total
      }, 0)

      const utxosBalance = utxos.reduce((total, utxo) => {
        const { status, amount } = utxo

        if (status !== 'spent' && status !== 'spent_unconfirmed') {
          total += amount
        }

        return total
      }, 0)

      return channelsBalance + utxosBalance
    })
  )
}

export const mergeDefaultWithSavedFilters = (defaults: Filter[], saved: Filter[] | null) => {
  if (saved) {
    const savedFilterOptions = defaults.map(filter => {
      const { key, label, type } = filter
      const savedFilter = saved.find(savedFilter => savedFilter.key === key)

      if (savedFilter) {
        if (type === 'one-of' && savedFilter.type === 'one-of') {
          return {
            label,
            key,
            type,
            values: filter.values.map(oneOf => {
              const savedOneOfValue = savedFilter.values.find(({ value }) => value === oneOf.value)
              if (savedOneOfValue) {
                return { ...oneOf, applied: savedOneOfValue.applied }
              } else {
                return oneOf
              }
            })
          }
        }

        if (type === 'date-range' && savedFilter.type === 'date-range') {
          return {
            label,
            key,
            type,
            values: { ...filter.values, ...savedFilter.values }
          }
        }

        if (type === 'amount-range' && savedFilter.type === 'amount-range') {
          return {
            label,
            key,
            type,
            values: { ...filter.values, ...savedFilter.values }
          }
        }

        if (type === 'exists' && savedFilter.type === 'exists') {
          return {
            label,
            key,
            type,
            applied: savedFilter.applied
          }
        }
      }

      return filter
    })

    return savedFilterOptions
  } else {
    return defaults
  }
}

export const anyFiltersApplied = (filters: Filter[]): boolean =>
  filters.some(filter => {
    if (filter.type === 'one-of' && filter.values.some(({ applied }) => applied)) {
      return true
    } else if (filter.type === 'exists' && filter.applied) {
      return true
    } else if (
      (filter.type === 'amount-range' || filter.type === 'date-range') &&
      (filter.values.gt !== null || filter.values.lt !== null)
    ) {
      return true
    } else {
      return false
    }
  })

export const getBlockTimestamp = async (height: number): Promise<number | null> => {
  try {
    const blockHash = await fetch(`https://mempool.space/api/block-height/${height}`).then(res =>
      res.text()
    )

    const block = await fetch(`https://mempool.space/api/block/${blockHash}`).then(res =>
      res.json()
    )

    return block.timestamp
  } catch (error) {
    const { message } = error as Error
    console.error(message)
    return null
  }
}

export const getNodeInfo = async (options: {
  nodePubkey: string
  getUpdated?: boolean
}): Promise<Node | null> => {
  const { nodePubkey, getUpdated } = options
  const connection = connections$.value.find(conn => conn.network?.getNode)
  let node: Node | null = (await db.nodes.get(nodePubkey)) || null

  if ((getUpdated || !node) && connection) {
    const updatedNode = await connection.network?.getNode(nodePubkey)

    if (updatedNode) {
      node = updatedNode
      await db.nodes.put(updatedNode)
    } else {
      await db.nodes.put({ id: nodePubkey, lastUpdated: nowSeconds() })
    }
  }

  return node
}

export const updateCounterPartyNodeInfo = async (
  counterParty: CounterPart
): Promise<Node | null> => {
  // if is node type and is more than a day old info, then get update
  if (
    counterParty.type === 'node' &&
    counterParty.value.lastUpdated + 10 * DAY_IN_SECS < nowSeconds()
  ) {
    return getNodeInfo({ nodePubkey: counterParty.value.id, getUpdated: true })
  }

  if (
    counterParty.type === 'unknown' &&
    nodePublicKeyRegex.test((counterParty.value as string) || '')
  ) {
    return getNodeInfo({ nodePubkey: counterParty.value as string })
  }

  return null
}
