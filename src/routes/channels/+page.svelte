<script lang="ts">
  import { goto } from '$app/navigation'
  import Button from '$lib/elements/Button.svelte'
  import Spinner from '$lib/elements/Spinner.svelte'
  import { translate } from '$lib/i18n/translations.js'
  import channels from '$lib/icons/channels.js'
  import plus from '$lib/icons/plus.js'
  import { channels$, settings$ } from '$lib/streams.js'
  import Big from 'big.js'
  import ChannelRow from './components/ChannelRow.svelte'
  import ErrorMsg from '$lib/elements/ErrorMsg.svelte'
  import { formatValueForDisplay } from '$lib/utils.js'
  import { convertValue } from '$lib/conversion.js'
  import { BitcoinDenomination } from '$lib/types.js'
  import SummaryRow from '$lib/elements/SummaryRow.svelte'

  $: sendableMsat =
    $channels$.data &&
    $channels$.data.reduce(
      (acc, { balanceLocal, reserveLocal }) =>
        Big(acc).add(balanceLocal).minus(reserveLocal).toString(),
      '0'
    )

  $: receivableMsat =
    $channels$.data &&
    $channels$.data.reduce(
      (acc, { balanceRemote, reserveRemote }) =>
        Big(acc).add(balanceRemote).minus(reserveRemote).toString(),
      '0'
    )
</script>

<svelte:head>
  <title>{$translate('app.titles./channels')}</title>
</svelte:head>

<section
  class="flex flex-col justify-center items-center w-full p-4 max-w-lg h-full overflow-hidden"
>
  <div class="flex items-center justify-between mb-4 mt-12 w-full">
    <div class="flex items-center">
      <div class="w-10 mr-2">{@html channels}</div>
      <h1 class="text-4xl font-bold">
        {$translate('app.titles./channels')}
      </h1>
    </div>

    <div>
      <Button on:click={() => goto('/channels/open')} text={$translate('app.buttons.open')} primary>
        <div slot="iconLeft" class="w-8 mb-[1px] -ml-2">
          {@html plus}
        </div>
      </Button>
    </div>
  </div>

  <div class="w-full overflow-hidden xs:pb-8">
    {#if $channels$.loading}
      <Spinner />
    {:else if $channels$.error}
      <ErrorMsg message={$channels$.error} />
    {:else if $channels$.data}
      <div class="w-full flex flex-col h-full overflow-hidden">
        <div class="w-full mb-4">
          <h2 class="font-bold text-lg underline underline-offset-2 mb-2">Summary</h2>

          <SummaryRow>
            <div slot="label">Channels:</div>
            <div slot="value">{$channels$.data.length}</div>
          </SummaryRow>

          <SummaryRow>
            <div slot="label">{$translate('app.labels.sendable')}:</div>
            <div slot="value">
              {formatValueForDisplay({
                value: convertValue({
                  value: sendableMsat && Big(sendableMsat).gt('0') ? sendableMsat : '0',
                  from: BitcoinDenomination.msats,
                  to: $settings$.primaryDenomination
                }),
                denomination: $settings$.primaryDenomination,
                commas: true
              })}
            </div>
          </SummaryRow>

          <SummaryRow>
            <div slot="label">{$translate('app.labels.receivable')}:</div>
            <div slot="value">
              {formatValueForDisplay({
                value: convertValue({
                  value: receivableMsat && Big(receivableMsat).gt('0') ? receivableMsat : '0',
                  from: BitcoinDenomination.msats,
                  to: $settings$.primaryDenomination
                }),
                denomination: $settings$.primaryDenomination,
                commas: true
              })}
            </div>
          </SummaryRow>
        </div>

        <div class="w-full flex flex-col flex-grow overflow-hidden">
          <h2 class="font-bold text-lg underline underline-offset-2 mb-2">Open channels</h2>

          <div class="flex flex-col h-full overflow-hidden">
            <div class="w-full flex flex-col h-full gap-y-4 overflow-auto">
              {#each $channels$.data as channel}
                <ChannelRow {channel} />
              {/each}
            </div>
          </div>
        </div>
      </div>
    {/if}
  </div>
</section>
