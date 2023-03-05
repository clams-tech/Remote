<script lang="ts">
  import { goto } from '$app/navigation'
  import { fade } from 'svelte/transition'
  import Slide from '$lib/elements/Slide.svelte'
  import { FiatDenomination } from '$lib/types'
  import { settings$ } from '$lib/streams'
  import { translate } from '$lib/i18n/translations'
  import SummaryRow from '$lib/elements/SummaryRow.svelte'
  import check from '$lib/icons/check'
  import settingsOutline from '$lib/icons/settings-outline'

  const labels: Record<string, string> = {
    usd: 'US Dollar (USD, $)',
    eur: 'Eurozone Euro (EUR, €)',
    gbp: 'British Pound (GBP, £)',
    cny: 'Chinese Yuan Renminbi (CNY, 元)',
    jpy: 'Japanese Yen (JPY, ¥)',
    cad: 'Canadian Dollar (CAD, $)',
    aud: 'Australian Dollar	(AUD, $)',
    hkd: 'Hong Kong Dollar (HKD, $)',
    sgd: 'Singapore Dollar (SGD, $)',
    sek: 'Swedish Krona (SEK, kr)',
    chf: 'Swiss Franc (CHF, CHF)',
    thb: 'Thai Baht (THB, ฿)',
    pln: 'Polish Zloty (PLN, zł)',
    nok: 'Norwegian Krone (NOK, kr)',
    myr: 'Malaysian Ringgit (MYR, RM)',
    dkk: 'Danish Krone (DKK, kr)',
    zar: 'South African Rand (ZAR, R)',
    nzd: 'New Zealand Dollar (NZD, $)',
    mxn: 'Mexican Peso (MXN, $)',
    rub: 'Russian Ruble (RUB, ₽)'
  }

  function setLocalCurrency(val: FiatDenomination) {
    const currentSettings = settings$.value

    settings$.next({
      ...currentSettings,
      fiatDenomination: val,
      primaryDenomination:
        currentSettings.primaryDenomination in FiatDenomination
          ? val
          : currentSettings.primaryDenomination,
      secondaryDenomination:
        currentSettings.secondaryDenomination in FiatDenomination
          ? val
          : currentSettings.secondaryDenomination
    })
  }
</script>

<svelte:head>
  <title>{$translate('app.titles./settings/currency')}</title>
</svelte:head>

<Slide
  back={() => {
    goto('/settings/app')
  }}
  backText={$translate('app.titles./settings/app')}
>
  <section in:fade class="flex flex-col justify-center w-full p-6 max-w-lg">
    <div class="flex items-center mb-6 mt-12">
      <div class="w-10 mr-2">{@html settingsOutline}</div>
      <h1 class="text-4xl font-bold">
        {$translate('app.titles./settings/currency')}
      </h1>
    </div>

    <div class="w-full h-full overflow-y-auto overflow-x-hidden">
      <SummaryRow>
        <span slot="label" class="font-bold">{$translate('app.labels.commonly_used')}</span>
      </SummaryRow>

      {#each Object.entries(FiatDenomination) as [key, val], index}
        {#if index < 2}
          <div on:click={() => setLocalCurrency(val)} class="cursor-pointer">
            <SummaryRow>
              <span slot="label" class="ml-4">{labels[key] || key}</span>
              <div slot="value">
                {#if $settings$.fiatDenomination === val}
                  <div in:fade={{ duration: 250 }} class="w-6">
                    {@html check}
                  </div>
                {/if}
              </div>
            </SummaryRow>
          </div>
        {/if}
      {/each}

      <SummaryRow>
        <span slot="label" class="font-bold">{$translate('app.labels.all_options')}</span>
      </SummaryRow>

      {#each Object.entries(FiatDenomination).sort(([a], [b]) => a.localeCompare(b)) as [key, val]}
        <div on:click={() => setLocalCurrency(val)} class="cursor-pointer">
          <SummaryRow>
            <span slot="label" class="ml-4">{labels[key] || key}</span>
            <div slot="value">
              {#if $settings$.fiatDenomination === val}
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
