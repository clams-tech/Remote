<script lang="ts">
  import { goto } from '$app/navigation'
  import type { Invoice } from '$lib/@types/invoices.js'
  import BitcoinAmount from '$lib/components/BitcoinAmount.svelte'
  import { formatDate } from '$lib/dates.js'
  import { translate } from '$lib/i18n/translations'
  import caret from '$lib/icons/caret'
  import { fade, slide } from 'svelte/transition'

  export let payments: Invoice[]

  let open = false
</script>

<div class="flex flex-col w-full">
  <button class="block w-full" on:click={() => (open = !open)}>
    <div class="flex items-center justify-end w-full">
      <div class="w-6 h-6 flex justify-center items-center rounded-full border border-current mr-2">
        {payments.length}
      </div>
      <div class="w-4 transition-all" class:rotate-180={open}>{@html caret}</div>
    </div>
  </button>

  {#if open}
    <div transition:slide|local class="transition-all overflow-hidden">
      <div class="mt-2 flex flex-col items-end gap-y-1">
        {#each payments as { completedAt, amount, status, direction, id }}
          <a
            href={`/payments/${id}`}
            class="text-sm flex items-center max-w-full no-underline border border-transparent transition-all rounded bg-neutral-900"
          >
            <div
              class="flex w-full px-1 rounded {status === 'complete'
                ? 'bg-utility-success/20 hover:border-utility-success/40'
                : status === 'expired' || status === 'failed'
                ? 'bg-utility-error/20 hover:border-utility-error/40'
                : 'bg-utility-pending/20 hover:border-utility-pending/40'}"
            >
              <span class="mr-1"
                >{$translate('app.labels.payment_status', {
                  status: status,
                  direction: direction
                })}
              </span>

              <BitcoinAmount sats={amount} />

              {#if completedAt}
                <div class="ml-1 flex items-center w-full truncate">
                  -
                  {#await formatDate(completedAt) then formatted}
                    <div
                      style="max-width: {Math.floor(window.innerWidth * 0.35)}px"
                      class="ml-1 truncate w-full"
                      in:fade|local={{ duration: 50 }}
                    >
                      {formatted}
                    </div>
                  {/await}
                </div>
              {/if}
            </div>
          </a>
        {/each}
      </div>
    </div>
  {/if}
</div>
