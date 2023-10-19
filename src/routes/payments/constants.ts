import type { Filter, OneOfFilter, Sorter } from '$lib/@types/common.js'
import { translate } from '$lib/i18n/translations.js'
import { wallets$ } from '$lib/streams.js'
import { get } from 'svelte/store'

export const PAYMENT_FILTER_OPTIONS: Filter[] = [
  {
    label: get(translate)('app.labels.status'),
    key: 'status',
    type: 'one-of',
    values: [
      {
        label: get(translate)('app.labels.pending'),
        value: 'pending',
        checked: false
      },
      {
        label: get(translate)('app.labels.waiting'),
        value: 'waiting',
        checked: false
      },
      {
        label: get(translate)('app.labels.complete'),
        value: 'complete',
        checked: false
      },
      {
        label: get(translate)('app.labels.expired'),
        value: 'expired',
        checked: false
      },
      {
        label: get(translate)('app.labels.failed'),
        value: 'failed',
        checked: false
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
        checked: false
      },
      {
        label: get(translate)('app.labels.receive_address'),
        value: 'address',
        checked: false
      },
      {
        label: get(translate)('app.labels.onchain'),
        value: 'transaction',
        checked: false
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
          checked: false
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
        checked: false
      },
      {
        label: get(translate)('app.labels.regtest'),
        value: 'regtest',
        checked: false
      },
      {
        label: get(translate)('app.labels.testnet'),
        value: 'testnet',
        checked: false
      }
    ]
  },
  {
    label: get(translate)('app.labels.channel'),
    key: 'data.channel',
    type: 'exists'
  },
  {
    key: 'data.offer',
    type: 'exists',
    label: get(translate)('app.labels.offer')
  }
]

export const PAYMENT_SORTER_OPTIONS: Sorter[] = [
  { label: get(translate)('app.labels.date'), key: 'timestamp', direction: 'desc', applied: true },
  {
    label: get(translate)('app.labels.amount'),
    key: 'data.amount',
    direction: 'desc',
    applied: false
  }
]
