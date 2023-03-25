<script lang="ts">
  import { goto } from '$app/navigation'
  import BackButton from '$lib/elements/BackButton.svelte'
  import Button from '$lib/elements/Button.svelte'
  import Slide from '$lib/elements/Slide.svelte'
  import Spinner from '$lib/elements/Spinner.svelte'
  import { translate } from '$lib/i18n/translations'
  import lightningOutline from '$lib/icons/lightning-outline'
  import plus from '$lib/icons/plus'
  import trendingDown from '$lib/icons/trending-down'
  import trendingUp from '$lib/icons/trending-up'
  import warning from '$lib/icons/warning'
  import { lastPath$, offers$, offersPayments$, settings$ } from '$lib/streams'
  import check from '$lib/icons/check'
  import cross from '$lib/icons/cross'
  import caret from '$lib/icons/caret'
  import info from '$lib/icons/info'
  import { convertValue } from '$lib/conversion'
  import { BitcoinDenomination } from '$lib/types'
  import { formatValueForDisplay } from '$lib/utils'
  import { currencySymbols } from '$lib/constants'

  const primarySymbol = currencySymbols[$settings$.primaryDenomination]

  $: nowSeconds = Date.now() / 1000
</script>

<svelte:head>
  <title>
    {$translate('app.titles./offers')}
  </title>
</svelte:head>

{#if $offers$.loading}
  <Spinner />
{:else if $offers$.error}
  <BackButton on:click={() => goto('/')} text={$translate('app.titles./')} />
  <section class="w-full p-4 max-w-lg flex flex-col items-center justify-center">
    <div class="flex items-center mb-6 mt-12">
      <div class="w-10 mr-2">{@html lightningOutline}</div>
      <h1 class="text-4xl font-bold">
        {$translate('app.titles./offers')}
      </h1>
    </div>
    <div class="flex text-utility-error">
      <div class="w-4 mr-2">{@html warning}</div>
      <p>
        {$translate('app.errors.offers_load_error')}
      </p>
    </div>
  </section>
{:else if $offers$.data}
  <Slide
    back={() => goto('/')}
    backText={$translate('app.titles./')}
    direction={(!$lastPath$ || $lastPath$) === '/' ? 'left' : 'right'}
  >
    <section class="flex flex-col justify-center items-start w-full p-4 max-w-lg">
      <div class="flex items-center justify-between mb-6 mt-12 w-full">
        <div class="flex items-center">
          <div class="w-10 mr-2">{@html lightningOutline}</div>
          <h1 class="text-4xl font-bold">
            {$translate('app.titles./offers')}
          </h1>
        </div>

        <div>
          <Button
            on:click={() => goto('/offers/bolt12')}
            text={$translate('app.buttons.create_offer')}
            primary
          >
            <div slot="iconLeft" class="w-8 mb-[1px]">
              {@html plus}
            </div>
          </Button>
        </div>
      </div>

      {#if !$offers$.data.length}
        <div class="flex items-start px-2.5 py-2 rounded border text-neutral-400 mt-2">
          <div class="w-6 mr-2 mt-1 border rounded-full border-current">
            {@html info}
          </div>
          <div>{$translate('app.hints.no_offers')}</div>
        </div>
      {:else}
        <div class="grid gap-4 w-full max-h-full overflow-auto">
          {#each $offers$.data as { label, id, type, active, single_use, used, amount, offerExpiry } (id)}
            {@const payments = $offersPayments$[id]}

            {@const status =
              offerExpiry && offerExpiry < nowSeconds
                ? 'expired'
                : active
                ? 'active'
                : single_use && payments.length
                ? 'complete'
                : 'disabled'}

            {@const value = formatValueForDisplay({
              value: convertValue({
                value: amount,
                from: BitcoinDenomination.msats,
                to: $settings$.primaryDenomination
              }),
              denomination: $settings$.primaryDenomination,
              commas: true
            })}

            <button
              on:click={() => goto(`/offers/${id}`)}
              class="w-full border border-current gap-x-2 rounded-md py-4 pl-4 pr-12 cursor-pointer flex shadow-sm dark:shadow-white/75 relative dark:hover:bg-neutral-800/40 hover:bg-neutral-50/50 transition-all"
            >
              <div class="w-1/2">
                <h2 class="text-2xl font-bold text-left">
                  {label || $translate(`app.labels.${type}`)}
                </h2>

                <div class="flex justify-start mt-1">
                  {#if value !== '0'}
                    <span
                      class="flex items-center justify-center"
                      class:w-4={primarySymbol.startsWith('<')}>{@html primarySymbol}</span
                    >
                  {/if}
                  <span
                    >{value === '0'
                      ? `${$translate('app.labels.any')} ${$translate('app.labels.amount')}`
                      : value}</span
                  >
                </div>
              </div>

              <div class="flex flex-wrap justify-end items-center gap-2 text-sm w-1/2">
                <div class="flex items-center rounded-full border pl-3 pr-2 py-1">
                  <div class="text-sm mr-1">{$translate(`app.labels.${type}`)}</div>
                  <div
                    class="w-4"
                    class:text-utility-success={type === 'pay'}
                    class:text-utility-error={type === 'withdraw'}
                  >
                    {@html type === 'pay' ? trendingUp : trendingDown}
                  </div>
                </div>

                <div class="flex items-center rounded-full border pl-3 pr-1 py-1">
                  <div class="text-sm mr-1">{$translate(`app.labels.${status}`)}</div>
                  <div
                    class="w-4"
                    class:text-utility-success={status === 'active' || status === 'complete'}
                    class:text-utility-error={status === 'disabled' || status === 'expired'}
                  >
                    {@html status === 'active' || status === 'complete' ? check : cross}
                  </div>
                </div>

                {#if single_use}
                  <div class="flex items-center rounded-full border px-3 py-1">
                    <div class="text-sm">
                      {$translate('app.labels.single_use')}
                    </div>
                  </div>
                {/if}

                {#if payments && payments.length}
                  <div class="flex items-center rounded-full border pl-3 pr-1 py-1">
                    {$translate('app.labels.payments')}
                    <div class="text-sm ml-1">
                      <div
                        class="px-1 text-xs rounded-full font-semibold border flex items-center justify-center border-utility-success text-utility-success mr-[2px]"
                      >
                        {payments.length}
                      </div>
                    </div>
                  </div>
                {/if}
              </div>

              <div class="absolute bottom-4 right-1 w-8 -rotate-90">
                {@html caret}
              </div>
            </button>
          {/each}
        </div>
      {/if}
    </section>
  </Slide>
{/if}
