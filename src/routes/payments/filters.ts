import type { Filter, OneOfFilter, Sorters } from '$lib/@types/common.js'
import { STORAGE_KEYS } from '$lib/constants.js'
import { translate } from '$lib/i18n/translations.js'
import { storage } from '$lib/services.js'
import { wallets$ } from '$lib/streams.js'
import { get } from 'svelte/store'

const getDefaultPaymentFilterOptions = (): Filter[] => {
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
    filterJson = storage.get(STORAGE_KEYS.filters.payments)
  } catch (error) {
    // no access to local storage
  }

  const saved: Filter[] | null = filterJson ? JSON.parse(filterJson) : null

  const defaultOptions = getDefaultPaymentFilterOptions()

  if (saved) {
    const savedFilterOptions = defaultOptions.map(filter => {
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

        if (
          (type === 'date-range' || type === 'amount-range') &&
          (savedFilter.type === 'date-range' || savedFilter.type === 'amount-range')
        ) {
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
    return defaultOptions
  }
}

export const getSorters = (): Sorters => {
  let sorterStr: string | null = null

  try {
    sorterStr = storage.get(STORAGE_KEYS.sorter.payments)
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
