import type { Filter, OneOfFilter, Sorter, Sorters } from '$lib/@types/common.js'
import { FILTER_STORAGE_KEYS } from '$lib/constants.js'
import { translate } from '$lib/i18n/translations.js'
import { storage } from '$lib/services.js'
import { wallets$ } from '$lib/streams.js'
import { mergeDefaultWithSavedFilters } from '$lib/utils.js'
import { get } from 'svelte/store'
import { walletTypes } from './wallets/index.js'

const paymentStatusFilter = (): Filter => ({
  label: get(translate)('app.labels.status'),
  key: 'status',
  type: 'one-of',
  values: [
    {
      label: get(translate)('app.labels.pending'),
      value: 'pending',
      applied: false
    },
    {
      label: get(translate)('app.labels.waiting'),
      value: 'waiting',
      applied: false
    },
    {
      label: get(translate)('app.labels.complete'),
      value: 'complete',
      applied: false
    },
    {
      label: get(translate)('app.labels.expired'),
      value: 'expired',
      applied: false
    },
    {
      label: get(translate)('app.labels.failed'),
      value: 'failed',
      applied: false
    }
  ]
})

const utxoStatusFilter = (): Filter => ({
  label: get(translate)('app.labels.status'),
  key: 'status',
  type: 'one-of',
  values: [
    {
      label: get(translate)('app.labels.unconfirmed'),
      value: 'unconfirmed',
      applied: false
    },
    {
      label: get(translate)('app.labels.confirmed'),
      value: 'confirmed',
      applied: false
    },
    {
      label: get(translate)('app.labels.spent'),
      value: 'spent',
      applied: false
    },
    {
      label: get(translate)('app.labels.spent_unconfirmed'),
      value: 'spent_unconfirmed',
      applied: false
    },
    {
      label: get(translate)('app.labels.immature'),
      value: 'immature',
      applied: false
    }
  ]
})

const channelStatusFilter = (): Filter => ({
  label: get(translate)('app.labels.status'),
  key: 'status',
  type: 'one-of',
  values: [
    {
      label: get(translate)('app.labels.active'),
      value: 'active',
      applied: false
    },
    {
      label: get(translate)('app.labels.opening'),
      value: 'opening',
      applied: false
    },
    {
      label: get(translate)('app.labels.closing'),
      value: 'closing',
      applied: false
    },
    {
      label: get(translate)('app.labels.closed'),
      value: 'closed',
      applied: false
    },
    {
      label: get(translate)('app.labels.force_closed'),
      value: 'force_closed',
      applied: false
    }
  ]
})

const paymentTypeFilter = (): Filter => ({
  key: 'type',
  type: 'one-of',
  label: get(translate)('app.labels.type'),
  values: [
    {
      label: get(translate)('app.labels.lightning'),
      value: 'invoice',
      applied: false
    },
    {
      label: get(translate)('app.labels.receive_address'),
      value: 'address',
      applied: false
    },
    {
      label: get(translate)('app.labels.onchain'),
      value: 'transaction',
      applied: false
    }
  ]
})

const offerTypeFilter = (): Filter => ({
  key: 'type',
  type: 'one-of',
  label: get(translate)('app.labels.type'),
  values: [
    {
      label: get(translate)('app.labels.pay'),
      value: 'pay',
      applied: false
    },
    {
      label: get(translate)('app.labels.withdraw'),
      value: 'withdraw',
      applied: false
    }
  ]
})

const walletFilter = (): Filter => ({
  key: 'walletId',
  type: 'one-of',
  label: get(translate)('app.labels.wallet'),
  values: wallets$.value.reduce((acc, wallet) => {
    if (wallet) {
      acc.push({
        label: wallet.label,
        value: wallet.id,
        applied: false
      })
    }

    return acc
  }, [] as OneOfFilter['values'])
})

const networkFilter = (): Filter => ({
  key: 'network',
  type: 'one-of',
  label: get(translate)('app.labels.network'),
  values: [
    {
      label: get(translate)('app.labels.bitcoin'),
      value: 'bitcoin',
      applied: false
    },
    {
      label: get(translate)('app.labels.regtest'),
      value: 'regtest',
      applied: false
    },
    {
      label: get(translate)('app.labels.testnet'),
      value: 'testnet',
      applied: false
    }
  ]
})

const timestampFilter = (key: string = 'timestamp', labelKey: string = 'date'): Filter => ({
  label: get(translate)(`app.labels.${labelKey}`),
  key,
  type: 'date-range',
  values: { gt: null, lt: null }
})

const amountFilter = (key: string = 'amount', labelKey: string = 'amount'): Filter => ({
  label: get(translate)(`app.labels.${labelKey}`),
  key,
  type: 'amount-range',
  values: { gt: null, lt: null }
})

const channelTransactionFilter = (): Filter => ({
  label: get(translate)('app.labels.channel'),
  key: 'data.channel',
  type: 'exists',
  applied: false
})

const offerInvoiceFilter = (): Filter => ({
  key: 'data.offer',
  type: 'exists',
  label: get(translate)('app.labels.offer'),
  applied: false
})

const offerActiveFilter = (): Filter => ({
  key: 'active',
  type: 'exists',
  label: get(translate)('app.labels.active'),
  applied: false
})

const forwardStatusFilter = (): Filter => ({
  label: get(translate)('app.labels.status'),
  key: 'status',
  type: 'one-of',
  values: [
    {
      label: get(translate)('app.labels.settled'),
      value: 'settled',
      applied: false
    },
    {
      label: get(translate)('app.labels.offered'),
      value: 'offered',
      applied: false
    },
    {
      label: get(translate)('app.labels.failed'),
      value: 'failed',
      applied: false
    },
    {
      label: get(translate)('app.labels.local_failed'),
      value: 'local_failed',
      applied: false
    }
  ]
})

const walletTypeFilter = (): Filter => ({
  label: get(translate)('app.labels.type'),
  key: 'type',
  type: 'one-of',
  values: walletTypes.map(type => ({
    label: get(translate)(`app.labels.${type}`),
    value: type,
    applied: false
  }))
})

const feeFilter = (): Filter => ({
  label: get(translate)('app.labels.fee'),
  key: 'fee',
  type: 'amount-range',
  values: { gt: null, lt: null }
})

const feeSorter = (): Sorter => ({
  label: get(translate)('app.labels.fee'),
  key: 'fee',
  direction: 'desc'
})

const amountSorter = (key: string = 'amount', labelKey: string = 'amount'): Sorter => ({
  label: get(translate)(`app.labels.${labelKey}`),
  key,
  direction: 'desc'
})

const timestampSorter = (key: string = 'timestamp', labelKey: string = 'date'): Sorter => ({
  label: get(translate)(`app.labels.${labelKey}`),
  key,
  direction: 'desc'
})

export const routeFilters = (route: string): Filter[] => {
  switch (route) {
    case 'payments':
      return [
        paymentStatusFilter(),
        paymentTypeFilter(),
        walletFilter(),
        networkFilter(),
        timestampFilter(),
        amountFilter('data.amount'),
        channelTransactionFilter(),
        offerInvoiceFilter()
      ]
    case 'utxos':
      return [
        utxoStatusFilter(),
        walletFilter(),
        amountFilter(),
        networkFilter(),
        timestampFilter()
      ]
    case 'channels':
      return [
        channelStatusFilter(),
        walletFilter(),
        amountFilter('balanceLocal', 'balance_local'),
        amountFilter('balanceRemote', 'balance_remote'),
        networkFilter()
      ]
    case 'offers':
      return [
        amountFilter(),
        offerTypeFilter(),
        walletFilter(),
        networkFilter(),
        offerActiveFilter()
      ]
    case 'forwards':
      return [forwardStatusFilter(), walletFilter(), feeFilter(), timestampFilter()]
    case 'wallets':
      return [walletTypeFilter()]
    default:
      throw new Error(`Unknown route: ${route}`)
  }
}

export const routeSorters = (route: string): Sorters => {
  switch (route) {
    case 'payments': {
      const timestamp = timestampSorter()

      return {
        applied: { key: timestamp.key, direction: timestamp.direction },
        options: [timestamp, amountSorter('data.amount')]
      }
    }
    case 'utxos': {
      const timestamp = timestampSorter()

      return {
        applied: { key: timestamp.key, direction: timestamp.direction },
        options: [timestamp, amountSorter()]
      }
    }
    case 'offers': {
      const amount = amountSorter()

      return {
        applied: { key: amount.key, direction: amount.direction },
        options: [amount]
      }
    }
    case 'channels': {
      const balanceLocal = amountSorter('balanceLocal', 'balance_local')
      const balanceRemote = amountSorter('balanceRemote', 'balance_remote')

      return {
        applied: { key: balanceLocal.key, direction: balanceLocal.direction },
        options: [balanceLocal, balanceRemote]
      }
    }
    case 'forwards': {
      const timestamp = timestampSorter()

      return {
        applied: { key: timestamp.key, direction: timestamp.direction },
        options: [timestamp, feeSorter()]
      }
    }
    case 'wallets': {
      const timestamp = timestampSorter('createdAt', 'created_at')

      return {
        applied: { key: timestamp.key, direction: timestamp.direction },
        options: [timestamp]
      }
    }
    case 'prisms': {
      const timestamp = timestampSorter()

      return {
        applied: { key: timestamp.key, direction: timestamp.direction },
        options: [timestamp]
      }
    }

    default: {
      throw new Error(`Unknown route: ${route}`)
    }
  }
}

// merges default filters with saved filters from storage if available
export const getFilters = (route: string): Filter[] => {
  let filterJson: string | null = null

  try {
    filterJson = storage.get(FILTER_STORAGE_KEYS.filters[route])
  } catch (error) {
    // no access to local storage
  }

  const saved: Filter[] | null = filterJson ? JSON.parse(filterJson) : null
  const defaultOptions = routeFilters(route)

  return mergeDefaultWithSavedFilters(defaultOptions, saved)
}

export const getSorters = (route: string): Sorters => {
  let sorterStr: string | null = null

  try {
    sorterStr = storage.get(FILTER_STORAGE_KEYS.sorter[route])
  } catch (error) {
    // no access to local storage
  }

  const savedSorter: Sorters['applied'] | null = sorterStr && JSON.parse(sorterStr)
  const defaultSorters = routeSorters(route)

  return {
    applied: savedSorter || defaultSorters.applied,
    options: defaultSorters.options
  }
}

export const getTags = (route: string): string[] => {
  let tagStr: string | null = null

  try {
    tagStr = storage.get(FILTER_STORAGE_KEYS.tags[route])
  } catch (error) {
    // no access to local storage
  }

  const savedTagFilters: string[] | null = tagStr && JSON.parse(tagStr)

  return savedTagFilters || []
}
