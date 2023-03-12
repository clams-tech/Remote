<script lang="ts">
  import { goto } from '$app/navigation'
  import { fade } from 'svelte/transition'
  import Slide from '$lib/elements/Slide.svelte'
  import { BitcoinDenomination } from '$lib/types'
  import { settings$ } from '$lib/streams'
  import { translate } from '$lib/i18n/translations'
  import SummaryRow from '$lib/elements/SummaryRow.svelte'
  import check from '$lib/icons/check'
  import bitcoin from '$lib/icons/bitcoin'
  import lightning from '$lib/icons/lightning'
  import settingsOutline from '$lib/icons/settings-outline'

  const bitcoinDenominations = [
    { value: BitcoinDenomination.btc, label: 'Bitcoin (BTC)', icon: bitcoin },
    { value: BitcoinDenomination.sats, label: 'Satoshi (SAT)', icon: lightning }
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
  <title>{$translate('app.titles./settings/unit')}</title>
</svelte:head>

<Slide
  back={() => {
    goto('/settings/app')
  }}
  backText={$translate('app.titles./settings/app')}
>
  <section in:fade class="flex flex-col justify-center w-full p-4 max-w-lg">
    <div class="flex items-center mb-6 mt-12">
      <div class="w-10 mr-2">{@html settingsOutline}</div>
      <h1 class="text-4xl font-bold">
        {$translate('app.titles./settings/unit')}
      </h1>
    </div>

    <div class="w-full">
      {#each bitcoinDenominations as { value, label, icon }}
        <div on:click={() => setBitcoinUnit(value)} class="cursor-pointer">
          <SummaryRow>
            <span class="flex items-center" slot="label"
              ><span class="block w-4 h-4 mr-1 flex-shrink-0">{@html icon}</span>
              {label}</span
            >
            <div slot="value">
              {#if $settings$.bitcoinDenomination === value}
                <div in:fade={{ duration: 250 }} class="w-6">
                  {@html check}
                </div>
              {/if}
            </div>
          </SummaryRow>
        </div>
      {/each}
    </div>
  </section>
</Slide>
