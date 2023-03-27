<script lang="ts">
  import { fade } from 'svelte/transition'
  import { convertValue } from '$lib/conversion'
  import { translate } from '$lib/i18n/translations'
  import { payments$, settings$ } from '$lib/streams'
  import { BitcoinDenomination } from '$lib/types'
  import { formatDate, formatValueForDisplay } from '$lib/utils'
  import caret from '$lib/icons/caret'
  import { currencySymbols } from '$lib/constants'
  import Spinner from '$lib/elements/Spinner.svelte'

  $: payment =
    $payments$.data &&
    $payments$.data.find(
      ({ status }) => status === 'complete' || status === 'pending' || status === 'expired'
    )

  $: primaryValue =
    payment &&
    convertValue({
      from: BitcoinDenomination.msats,
      to: $settings$.primaryDenomination,
      value: payment.value
    })

  $: primarySymbol = currencySymbols[$settings$.primaryDenomination]
</script>

{#if payment}
  <a
    href="/payments"
    class="absolute bottom-4 flex items-end pl-4 pr-2 py-1 border border-neutral-100 dark:border-neutral-800 shadow-sm dark:shadow-neutral-700 rounded-md dark:hover:bg-neutral-800/40 hover:bg-neutral-50/50 transition-all"
  >
    <div>
      <span class="mr-1 text-neutral-400 leading-none text-sm"
        >{$translate('app.titles./payments')}</span
      >
      <div class="flex flex-col">
        <div class="flex">
          <span
            class:mr-1={!primarySymbol.startsWith('<')}
            class:mr-[2px]={primarySymbol.startsWith('<')}
            >{$translate('app.payment.status', {
              status: payment.status,
              direction: payment.direction
            })}:
          </span>
          <span class="flex items-center">
            <span
              class="flex justify-center items-center"
              class:w-4={primarySymbol.startsWith('<')}
              class:mr-[2px]={!primarySymbol.startsWith('<')}>{@html primarySymbol}</span
            >
            {#if primaryValue}
              {formatValueForDisplay({
                value: primaryValue,
                denomination: $settings$.primaryDenomination,
                commas: true
              })}
            {:else}
              <div class="ml-1">
                <Spinner size="1rem" />
              </div>
            {/if}
          </span>

          {#if payment.completedAt}
            <span class="ml-1">
              {#await formatDate( { date: payment.completedAt, language: $settings$.language } ) then formatted}
                <span in:fade|local={{ duration: 50 }}>- {formatted}</span>
              {/await}
            </span>
          {/if}
        </div>
      </div>
    </div>
    <div class="w-5 text-neutral-400 ml-2 mb-[2px] -rotate-90">{@html caret}</div>
  </a>
{/if}
