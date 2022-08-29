<script lang="ts">
  import { convertValue } from '$lib/conversion'

  import { translate } from '$lib/i18n/translations'
  import Caret from '$lib/icons/Caret.svelte'
  import { payments$, settings$ } from '$lib/streams'

  import { BitcoinDenomination } from '$lib/types'
  import { formatDate, formatValueForDisplay } from '$lib/utils'

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
</script>

{#if payment && primaryValue}
  <a href="/payments" class="absolute bottom-2 flex flex-col items-center justify-center p-4">
    <div class="w-4 text-neutral-400 mb-1"><Caret direction="up" /></div>
    <div class="flex flex-col items-center justify-center">
      <span>
        <span
          >{$translate('app.payment.status', {
            status: payment.status,
            direction: payment.direction
          })}:
        </span>
        <span
          >{formatValueForDisplay({
            value: primaryValue,
            denomination: $settings$.primaryDenomination
          })}
          {$settings$.primaryDenomination}</span
        >
      </span>
      {#if payment.completedAt}
        <span
          >{formatDate({
            date: payment.completedAt,
            language: $settings$.language
          })}</span
        >
      {/if}
    </div>
  </a>
{/if}
