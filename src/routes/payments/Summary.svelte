<script lang="ts">
  import type { Network, PaymentStatus } from '$lib/@types/payments.js'
  import { formatDate } from '$lib/dates.js'
  import { translate } from '$lib/i18n/translations.js'
  import type { PaymentSummary } from '$lib/summary.js'
  import { truncateValue } from '$lib/utils.js'

  export let primary: PaymentSummary['primary']
  export let type: PaymentSummary['type']
  export let secondary: PaymentSummary['secondary']
  export let status: PaymentStatus
  export let timestamp: number | null
  export let network: Network
  export let centered = false
  export let displayNetwork = false
</script>

<div class="w-full overflow-hidden">
  {#if primary.type === 'unknown' && secondary.type === 'unknown'}
    <div>
      <span class="font-semibold text-purple-100 uppercase">
        {$translate('app.labels.unknown')}
      </span>

      <span class="italic lowercase">
        {$translate('app.labels.transaction')}
      </span>
    </div>
  {:else}
    <div class="flex flex-wrap gap-x-1">
      <span class="font-semibold text-purple-100 uppercase truncate block">
        {#if primary.type === 'wallet'}
          {primary.value.label}
        {:else if primary.type === 'contact'}
          {primary.value.name}
        {:else if primary.type === 'channel_peer' && primary.value}
          {truncateValue(primary.value, 8)}
        {:else}
          {$translate('app.labels.unknown')}
        {/if}
      </span>

      <span class="italic">
        {$translate(`app.labels.summary_${type}_${status}`, { counterpartType: secondary.type })}
      </span>

      <span class="font-semibold text-purple-100 uppercase truncate block">
        {#if secondary.type === 'wallet'}
          {secondary.value.label}
        {:else if secondary.type === 'contact'}
          {secondary.value.name}
        {:else if secondary.type === 'node'}
          {secondary.value.alias || truncateValue(secondary.value.id)}
        {:else if secondary.type === 'channel_peer'}
          {secondary.value
            ? truncateValue(secondary.value, 8, type === 'channel_multiple_open' ? 'end' : 'center')
            : $translate('app.labels.unknown')}
        {:else if secondary.type === 'unknown'}
          {secondary.value ? truncateValue(secondary.value, 8) : $translate('app.labels.unknown')}
        {/if}
      </span>
    </div>
  {/if}

  <div class="flex items-center gap-x-1 truncate leading-tight" class:justify-center={centered}>
    {#if timestamp}
      {#await formatDate(timestamp, 'do MMM hh:mma') then formatted}
        <div class="text-[0.75em] font-semibold mt-1">{formatted}</div>
      {/await}
    {/if}

    {#if network !== 'bitcoin' && displayNetwork}
      <div class="text-xs px-2 py-1 font-semibold bg-neutral-700 rounded-full leading-none">
        {network}
      </div>
    {/if}
  </div>
</div>
