import { translate } from '$lib/i18n/translations.js'
import { wallets$ } from '$lib/streams.js'
import { get } from 'svelte/store'

// {
//   label: get(translate)('app.labels.offer'),
//   checked: false,
//   predicate: {
//     key: 'offer',
//     values: [],
//     compare: 'exists'
//   }
// }

export const PAYMENT_FILTER_OPTIONS = [
  {
    label: get(translate)('app.labels.status'),
    values: [
      {
        label: get(translate)('app.labels.pending'),
        value: 'pending'
      },
      {
        label: get(translate)('app.labels.waiting'),
        value: 'waiting'
      },
      {
        label: get(translate)('app.labels.complete'),
        value: 'complete'
      },
      {
        label: get(translate)('app.labels.expired'),
        value: 'expired'
      },
      {
        label: get(translate)('app.labels.failed'),
        value: 'failed'
      }
    ]
  },
  {
    label: get(translate)('app.labels.type'),
    values: [
      {
        label: get(translate)('app.labels.lightning'),
        value: 'invoice'
      },
      {
        label: get(translate)('app.labels.onchain'),
        value: 'address'
      }
    ]
  },
  {
    label: get(translate)('app.labels.wallet'),
    values: wallets$.value.reduce((acc, wallet) => {
      if (wallet) {
        acc.push({
          label: wallet.label,
          value: wallet.id
        })
      }

      return acc
    }, [] as { label: string; value: string }[])
  },
  {
    label: get(translate)('app.labels.network'),
    values: [
      {
        label: get(translate)('app.labels.bitcoin'),
        key: 'network',
        value: 'bitcoin'
      },
      {
        label: get(translate)('app.labels.regtest'),
        key: 'network',
        value: 'regtest'
      },
      {
        label: get(translate)('app.labels.testnet'),
        key: 'network',
        value: 'testnet'
      }
    ]
  }
  // {
  //   label: get(translate)('app.labels.channel'),
  //   checked: false,
  //   predicate: {
  //     key: 'channel',
  //     values: [],
  //     compare: 'exists'
  //   }
  // },
]
