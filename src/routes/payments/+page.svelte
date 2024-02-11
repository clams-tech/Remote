<script lang="ts">
  import PaymentRow from './PaymentRow.svelte'
  import plus from '$lib/icons/plus.js'
  import { translate } from '$lib/i18n/translations.js'
  import { fetchInvoices, fetchTransactions, fetchUtxos } from '$lib/wallets/index.js'
  import type { Filter, Sorters } from '$lib/@types/common.js'
  import { getFilters, getSorters, getTags } from '$lib/filters.js'
  import type { Connection } from '$lib/wallets/interfaces.js'
  import ItemsList from '$lib/components/ItemsList.svelte'
  import type { Payment } from '$lib/@types/payments.js'
  import { db } from '$lib/db/index.js'
  import type { Channel } from '$lib/@types/channels.js'
  import { updateAddresses, updateInvoices } from '$lib/db/helpers.js'

  const route = 'payments'
  const rowSize = 88
  const filters: Filter[] = getFilters(route)
  const sorters: Sorters = getSorters(route)
  const tags: string[] = getTags(route)

  const sync = async (connection: Connection) => {
    await Promise.all([
      fetchInvoices(connection),
      fetchTransactions(connection),
      fetchUtxos(connection)
    ])

    await Promise.all([updateAddresses(), updateInvoices()])
  }

  const button = {
    href: '/payments/receive',
    text: $translate('app.labels.receive'),
    icon: plus
  }

  const dedupe = async (payments: Payment[]): Promise<Payment[]> => {
    const deduped = new Map<string, Payment>()

    for (const payment of payments) {
      const currentPaymentWithSameId = deduped.get(payment.id)

      if (currentPaymentWithSameId) {
        if (payment.type === 'transaction') {
          const {
            data: { channel, inputs },
            walletId,
            id
          } = payment

          let transactionChannel: Channel | undefined

          if (channel) {
            const channels = await db.channels.where({ id: channel.id }).toArray()

            transactionChannel = channels.find(
              ({ opener, closer }) =>
                ((channel?.type === 'close' || channel?.type === 'force_close') &&
                  closer === 'local') ||
                opener === 'local'
            )
          }

          // favour channel closer or opener
          if (transactionChannel?.walletId === walletId) {
            deduped.set(id, payment)
          } else {
            const spentInputUtxo = await db.utxos
              .where('id')
              .anyOf(inputs.map(({ txid, index }) => `${txid}:${index}`))
              .first()

            if (spentInputUtxo?.walletId === walletId) {
              // favour spender
              deduped.set(id, payment)
            }
          }
        }

        if (payment.type === 'invoice' && currentPaymentWithSameId.type === 'invoice') {
          // if duplicates (we are both parties to invoice), keep the sender copy
          if (currentPaymentWithSameId.data.direction === 'receive') {
            deduped.set(payment.id, payment)
          }
        }
      } else {
        /**don't include address types that already have a txid
         * meaning that there is already a transaction for this
         */
        if (payment.type !== 'address' || !payment.data.txid) {
          deduped.set(payment.id, payment)
        }
      }
    }

    return Array.from(deduped.values())
  }
</script>

<svelte:head>
  <title>{$translate(`app.routes./payments.title`)}</title>
</svelte:head>

<ItemsList {filters} {sorters} {tags} {sync} {button} {route} {rowSize} {dedupe}>
  <div class="w-full overflow-hidden" slot="row" let:item>
    <PaymentRow payment={item} />
  </div>
</ItemsList>
