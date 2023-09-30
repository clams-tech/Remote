<script lang="ts">
  import { db } from '$lib/db/index.js'
  import Msg from '$lib/components/Msg.svelte'
  import Section from '$lib/components/Section.svelte'
  import SectionHeading from '$lib/components/SectionHeading.svelte'
  import Spinner from '$lib/components/Spinner.svelte'
  import { liveQuery } from 'dexie'
  import { fade } from 'svelte/transition'
  import { translate } from '$lib/i18n/translations.js'
  import Coin from './Coin.svelte'
  import SummaryRow from '$lib/components/SummaryRow.svelte'
  import BitcoinAmount from '$lib/components/BitcoinAmount.svelte'
  import wallet from '$lib/icons/wallet.js'
  import type { Utxo } from '$lib/@types/utxos.js'
  import FilterSort from '$lib/components/FilterSort.svelte'
  import { filter, from, takeUntil } from 'rxjs'
  import { onDestroy$ } from '$lib/streams.js'
  import type { Filter, Sorter, TagFilter } from '$lib/@types/common.js'

  const utxos$ = from(liveQuery(async () => db.utxos.toArray()))

  $: totals = $utxos$
    ? $utxos$.reduce(
        (acc, utxo) => {
          const { amount, status } = utxo

          if (status !== 'spent' && status !== 'spent_unconfirmed') {
            acc.balance += amount
            acc.num += 1

            if (status !== 'immature') {
              acc.sendable += amount
            }
          }

          return acc
        },
        { balance: 0, sendable: 0, num: 0 }
      )
    : null

  let processed: Utxo[] = []
  let filters: Filter[] = []
  let tagFilters: TagFilter[] = []

  let sorters: Sorter[] = [
    { label: $translate('app.labels.date'), key: 'timestamp', direction: 'desc' },
    { label: $translate('app.labels.amount'), key: 'amount', direction: 'desc' }
  ]

  // once we have offers, create filters, tag filters
  utxos$
    .pipe(
      filter(x => !!x),
      takeUntil(onDestroy$)
    )
    .subscribe(async utxos => {
      const walletIdSet = new Set<string>()
      const tagSet = new Set()

      for (const { walletId, id } of utxos) {
        walletIdSet.add(walletId)

        const metadata = await db.metadata.get(id)

        if (metadata) {
          metadata.tags.forEach(tag => tagSet.add(tag))
        }
      }

      const wallets = await db.wallets.bulkGet(Array.from(walletIdSet.values()))

      const walletFilter = {
        label: $translate('app.labels.wallet'),
        values: wallets.reduce((acc, wallet) => {
          if (wallet) {
            acc.push({
              label: wallet.label,
              checked: false,
              predicate: {
                key: 'walletId',
                values: [wallet.id]
              }
            })
          }

          return acc
        }, [] as Filter['values'])
      }

      tagFilters = Array.from(tagSet.values()).map(tag => ({
        tag: tag as string,
        checked: false
      }))

      filters = [
        {
          label: $translate('app.labels.status'),
          values: [
            {
              label: $translate('app.labels.unconfirmed'),
              checked: false,
              predicate: {
                key: 'status',
                values: ['unconfirmed']
              }
            },
            {
              label: $translate('app.labels.confirmed'),
              checked: false,
              predicate: {
                key: 'status',
                values: ['confirmed']
              }
            },
            {
              label: $translate('app.labels.spent'),
              checked: false,
              predicate: {
                key: 'status',
                values: ['spent']
              }
            },
            {
              label: $translate('app.labels.spent_unconfirmed'),
              checked: false,
              predicate: {
                key: 'status',
                values: ['spent_unconfirmed']
              }
            },
            {
              label: $translate('app.labels.immature'),
              checked: false,
              predicate: {
                key: 'status',
                values: ['immature']
              }
            }
          ]
        },
        walletFilter
      ]
    })
</script>

<Section>
  <div class="w-full flex items-center justify-between">
    <SectionHeading icon={wallet} />

    {#if $utxos$}
      <FilterSort items={$utxos$} bind:filters bind:tagFilters bind:sorters bind:processed />
    {/if}
  </div>

  <div class="w-full overflow-hidden flex">
    {#if !$utxos$}
      <div in:fade={{ duration: 250 }} class="mt-4 w-full flex justify-center">
        <Spinner />
      </div>
    {:else if !$utxos$.length}
      <div class="mt-4 w-full">
        <Msg closable={false} type="info" message={$translate('app.labels.no_utxos')} />
      </div>
    {:else}
      <div class="w-full h-full overflow-hidden flex flex-col">
        <div class="w-full mb-4">
          <SummaryRow>
            <div slot="label">{$translate('app.labels.total')}:</div>
            <div slot="value">{totals?.num} utxos</div>
          </SummaryRow>

          <SummaryRow>
            <div slot="label">{$translate('app.labels.balance')}:</div>
            <div slot="value">
              {#if totals}
                <BitcoinAmount sats={totals.balance} />
              {/if}
            </div>
          </SummaryRow>

          <SummaryRow>
            <div slot="label">{$translate('app.labels.spendable')}:</div>
            <div slot="value">
              {#if totals}
                <BitcoinAmount sats={totals.sendable} />
              {/if}
            </div>
          </SummaryRow>
        </div>

        <div
          class="w-full flex items-center justify-center flex-wrap flex-grow overflow-auto gap-2"
        >
          {#each processed as utxo}
            <Coin {utxo} />
          {/each}
        </div>
      </div>
    {/if}
  </div>
</Section>
