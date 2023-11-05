import type { Filter, OneOfFilter, Sorters } from '$lib/@types/common.js'
import { STORAGE_KEYS } from '$lib/constants.js'
import { translate } from '$lib/i18n/translations.js'
import { storage } from '$lib/services.js'
import { wallets$ } from '$lib/streams.js'
import { mergeDefaultWithSavedFilters } from '$lib/utils.js'
import { get } from 'svelte/store'

export const getDefaultFilterOptions = (): Filter[] => {
  return [
    {
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
      label: get(translate)('app.labels.date'),
      key: 'timestamp',
      type: 'date-range',
      values: { gt: null, lt: null }
    },
    {
      label: get(translate)('app.labels.fee'),
      key: 'fee',
      type: 'amount-range',
      values: { gt: null, lt: null }
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
    }
  ]
}

export const getDefaultSorters = (): Sorters => ({
  applied: { key: 'timestamp', direction: 'desc' },
  options: [
    { label: get(translate)('app.labels.date'), key: 'timestamp', direction: 'desc' },
    {
      label: get(translate)('app.labels.fee'),
      key: 'fee',
      direction: 'desc'
    }
  ]
})

// merges default filters with saved filters from storage if available
export const getFilters = (): Filter[] => {
  let filterJson: string | null = null

  try {
    filterJson = storage.get(STORAGE_KEYS.filters.forwards)
  } catch (error) {
    // no access to local storage
  }

  const saved: Filter[] | null = filterJson ? JSON.parse(filterJson) : null
  const defaultOptions = getDefaultFilterOptions()

  return mergeDefaultWithSavedFilters(defaultOptions, saved)
}

export const getSorters = (): Sorters => {
  let sorterStr: string | null = null

  try {
    sorterStr = storage.get(STORAGE_KEYS.sorter.forwards)
  } catch (error) {
    // no access to local storage
  }

  const savedSorter: Sorters['applied'] | null = sorterStr && JSON.parse(sorterStr)
  const defaultSorters = getDefaultSorters()

  return {
    applied: savedSorter || defaultSorters.applied,
    options: defaultSorters.options
  }
}

export const getTags = (): string[] => {
  let tagStr: string | null = null

  try {
    tagStr = storage.get(STORAGE_KEYS.tags.forwards)
  } catch (error) {
    // no access to local storage
  }

  const savedTagFilters: string[] | null = tagStr && JSON.parse(tagStr)

  return savedTagFilters || []
}
