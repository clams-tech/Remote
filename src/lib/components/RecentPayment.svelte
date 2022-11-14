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
    $payments$.data.find(({ status }) => status === 'complete' || status === 'pending')

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
  <a href="/payments" class="absolute bottom-2 flex flex-col items-center justify-center p-4">
    <div class="w-4 text-neutral-400 mb-1 rotate-180">{@html caret}</div>
    <div class="flex flex-col items-center">
      <div class="flex">
        <span
          >{$translate('app.payment.status', {
            status: payment.status,
            direction: payment.direction
          })}:
        </span>
        <span class="flex items-center ml-1">
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
      </div>
      {#if payment.completedAt}
        <span>
          {#await formatDate( { date: payment.completedAt, language: $settings$.language } ) then formatted}
            <span in:fade={{ duration: 50 }}>{formatted}</span>
          {/await}
        </span>
      {/if}
    </div>
  </a>
{/if}
