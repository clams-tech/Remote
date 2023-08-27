<script lang="ts">
  import { db } from '$lib/db.js'
  import Msg from '$lib/components/Msg.svelte'
  import Section from '$lib/components/Section.svelte'
  import SectionHeading from '$lib/components/SectionHeading.svelte'
  import Spinner from '$lib/components/Spinner.svelte'
  import { liveQuery } from 'dexie'
  import { fade, slide } from 'svelte/transition'
  import filter from '$lib/icons/filter.js'
  import { translate } from '$lib/i18n/translations.js'
  import Coin from './components/Coin.svelte'
  import SummaryRow from '$lib/components/SummaryRow.svelte'
  import BitcoinAmount from '$lib/components/BitcoinAmount.svelte'
  import Big from 'big.js'
  import wallet from '$lib/icons/wallet.js'

  const utxos$ = liveQuery(async () => db.utxos.toArray())

  $: totals = $utxos$
    ? $utxos$.reduce(
        (acc, utxo) => {
          const { amount, status } = utxo

          if (status !== 'spent' && status !== 'spent_unconfirmed') {
            acc.balance += amount

            if (status !== 'immature') {
              acc.sendable += amount
            }
          }

          return acc
        },
        { balance: 0, sendable: 0 }
      )
    : null

  let showFilters = false
  const toggleFilters = () => (showFilters = !showFilters)
</script>

<Section>
  <div class="w-full flex items-center justify-between">
    <SectionHeading icon={wallet} />

    <button on:click={toggleFilters} class="w-8">{@html filter}</button>
  </div>

  {#if showFilters}
    <div in:slide>
      <!-- @TODO - Checkbox filters -->
    </div>
  {/if}

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
            <div slot="value">{$utxos$.length} utxos</div>
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
          {#each $utxos$ as utxo}
            <Coin {utxo} />
          {/each}
        </div>
      </div>
    {/if}
  </div>
</Section>
