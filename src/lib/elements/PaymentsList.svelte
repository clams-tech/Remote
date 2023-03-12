<script lang="ts">
  import { goto } from '$app/navigation'
  import { currencySymbols } from '$lib/constants'
  import { convertValue } from '$lib/conversion'
  import { translate } from '$lib/i18n/translations'
  import caret from '$lib/icons/caret'
  import { settings$ } from '$lib/streams'
  import { BitcoinDenomination, type Payment } from '$lib/types'
  import { formatDate, formatValueForDisplay } from '$lib/utils'
  import { fade } from 'svelte/transition'

  export let payments: Payment[]

  let open = false

  $: primarySymbol = currencySymbols[$settings$.primaryDenomination]
</script>

<div class="flex flex-col">
  <button class="block" on:click={() => (open = !open)}>
    <div class="flex items-center justify-end w-full">
      <div class="w-6 h-6 flex justify-center items-center rounded-full border border-current mr-2">
        {payments.length}
      </div>
      <div class="w-4 transition-all" class:rotate-180={open}>{@html caret}</div>
    </div>
  </button>

  <div
    style="height: {open ? payments.length * 20 + 8 + (payments.length - 1) * 4 : 0}px;"
    class="transition-all overflow-hidden"
  >
    <div class="mt-2 flex flex-col items-end gap-y-1">
      {#each payments as { completedAt, value, status, direction, id }}
        <button
          on:click={() => goto(`/payments/${id}`)}
          class="text-sm block px-1 hover:brightness-200  transition-all  rounded {direction ===
            'receive' && status === 'complete'
            ? 'bg-utility-success/20'
            : status === 'expired'
            ? 'bg-utility-error/20'
            : 'bg-utility-pending/20'}"
        >
          <div class="flex justify-end">
            <span
              >{$translate('app.payment.status', {
                status: status,
                direction: direction
              })}:
            </span>
            <span class="flex items-center">
              <span
                class="flex justify-center items-center"
                class:w-4={primarySymbol.startsWith('<')}
                class:mr-[2px]={!primarySymbol.startsWith('<')}>{@html primarySymbol}</span
              >
              {formatValueForDisplay({
                value: convertValue({
                  value,
                  from: BitcoinDenomination.msats,
                  to: $settings$.primaryDenomination
                }),
                denomination: $settings$.primaryDenomination,
                commas: true
              })}
            </span>
            {#if completedAt}
              <span class="ml-1">
                {#await formatDate( { date: completedAt, language: $settings$.language } ) then formatted}
                  <span in:fade={{ duration: 50 }}>{formatted}</span>
                {/await}
              </span>
            {/if}
          </div>
        </button>
      {/each}
    </div>
  </div>
</div>
