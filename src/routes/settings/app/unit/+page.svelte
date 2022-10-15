<script lang="ts">
  import { goto } from '$app/navigation'
  import { fade } from 'svelte/transition'
  import Slide from '$lib/elements/Slide.svelte'
  import { BitcoinDenomination } from '$lib/types'
  import { settings$ } from '$lib/streams'
  import Check from '$lib/icons/Check.svelte'
  import { translate } from '$lib/i18n/translations'
  import SummaryRow from '$lib/elements/SummaryRow.svelte'

  const bitcoinDenominations = [
    { value: BitcoinDenomination.btc, label: 'Bitcoin (BTC, ₿)' },
    { value: BitcoinDenomination.sats, label: 'Satoshi (SAT)' }
  ]

  function setBitcoinUnit(key: BitcoinDenomination) {
    const currentSettings = settings$.value
    const val = BitcoinDenomination[key]

    settings$.next({
      ...currentSettings,
      bitcoinDenomination: val,
      primaryDenomination:
        currentSettings.primaryDenomination in BitcoinDenomination
          ? val
          : currentSettings.primaryDenomination,
      secondaryDenomination:
        currentSettings.secondaryDenomination in BitcoinDenomination
          ? val
          : currentSettings.secondaryDenomination
    })
  }
</script>

<svelte:head>
  <title>{$translate('app.titles.settings_unit')}</title>
</svelte:head>

<Slide
  back={() => {
    goto('/settings/app')
  }}
>
  <section in:fade class="flex flex-col items-center justify-center w-full p-6 max-w-xl">
    <h1 class="text-lg w-full text-center my-6 font-bold">
      {$translate('app.titles.settings_unit')}
    </h1>
    <div class="w-full">
      {#each bitcoinDenominations as { value, label }}
        <div on:click={() => setBitcoinUnit(value)} class="cursor-pointer">
          <SummaryRow>
            <span slot="label">{label}</span>
            <div slot="value">
              {#if $settings$.bitcoinDenomination === value}
                <div in:fade={{ duration: 250 }} class="w-6">
                  <Check />
                </div>
              {/if}
            </div>
          </SummaryRow>
        </div>
      {/each}
    </div>
  </section>
</Slide>
