import type { Filter, OneOfFilter, Sorters } from '$lib/@types/common.js'
import { FILTER_STORAGE_KEYS } from '$lib/constants.js'
import { translate } from '$lib/i18n/translations.js'
import { storage } from '$lib/services.js'
import { wallets$ } from '$lib/streams.js'
import { mergeDefaultWithSavedFilters } from '$lib/utils.js'
import { get } from 'svelte/store'

export const getDefaultPaymentFilterOptions = (): Filter[] => {
  return [
    {
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
    },
    {
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
    },
    {
      key: 'wallet',
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
    },
    {
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
    },
    {
      label: get(translate)('app.labels.date'),
      key: 'timestamp',
      type: 'date-range',
      values: { gt: null, lt: null }
    },
    {
      label: get(translate)('app.labels.amount'),
      key: 'data.amount',
      type: 'amount-range',
      values: { gt: null, lt: null }
    },
    {
      label: get(translate)('app.labels.channel'),
      key: 'data.channel',
      type: 'exists',
      applied: false
    },
    {
      key: 'data.offer',
      type: 'exists',
      label: get(translate)('app.labels.offer'),
      applied: false
    }
  ]
}

export const getDefaultPaymentSorters = (): Sorters => ({
  applied: { key: 'timestamp', direction: 'desc' },
  options: [
    { label: get(translate)('app.labels.date'), key: 'timestamp', direction: 'desc' },
    {
      label: get(translate)('app.labels.amount'),
      key: 'data.amount',
      direction: 'desc'
    }
  ]
})

// merges default filters with saved filters from storage if available
export const getFilters = (): Filter[] => {
  let filterJson: string | null = null

  try {
    filterJson = storage.get(FILTER_STORAGE_KEYS.filters.payments)
  } catch (error) {
    // no access to local storage
  }

  const saved: Filter[] | null = filterJson ? JSON.parse(filterJson) : null
  const defaultOptions = getDefaultPaymentFilterOptions()

  return mergeDefaultWithSavedFilters(defaultOptions, saved)
}

export const getSorters = (): Sorters => {
  let sorterStr: string | null = null

  try {
    sorterStr = storage.get(FILTER_STORAGE_KEYS.sorter.payments)
  } catch (error) {
    // no access to local storage
  }

  const savedSorter: Sorters['applied'] | null = sorterStr && JSON.parse(sorterStr)
  const defaultSorters = getDefaultPaymentSorters()

  return {
    applied: savedSorter || defaultSorters.applied,
    options: defaultSorters.options
  }
}

export const getTags = (): string[] => {
  let tagStr: string | null = null

  try {
    tagStr = storage.get(FILTER_STORAGE_KEYS.tags.payments)
  } catch (error) {
    // no access to local storage
  }

  const savedTagFilters: string[] | null = tagStr && JSON.parse(tagStr)

  return savedTagFilters || []
}
