<script lang="ts">
  import type { Network, PaymentStatus } from '$lib/@types/payments.js'
  import { translate } from '$lib/i18n/translations.js'
  import type { PaymentSummary } from '$lib/summary.js'
  import { truncateValue } from '$lib/utils.js'

  export let primary: PaymentSummary['primary']
  export let type: PaymentSummary['type']
  export let secondary: PaymentSummary['secondary']
  export let status: PaymentStatus
  export let timestamp: string = ''
  export let network: Network
  export let centered = false
  export let displayNetwork = false
</script>

<div>
  <div>
    <span class="font-semibold text-purple-100 uppercase">
      {#if primary.type === 'wallet'}
        {primary.value.label}
      {:else if primary.type === 'contact'}
        {primary.value.name}
      {:else if primary.type === 'channel_peer' && primary.value}
        {truncateValue(primary.value, 4)}
      {:else}
        {$translate('app.labels.unknown')}
      {/if}
    </span>

    <span class="italic">
      {$translate(`app.labels.summary_${type}_${status}`, { counterpartType: secondary.type })}
    </span>

    <span class="font-semibold text-purple-100 uppercase">
      {#if secondary.type === 'wallet'}
        {secondary.value.label}
      {:else if secondary.type === 'contact'}
        {secondary.value.name}
      {:else if secondary.type === 'node'}
        {secondary.value.alias || truncateValue(secondary.value.id)}
      {:else if secondary.type === 'channel_peer'}
        {secondary.value
          ? truncateValue(secondary.value, 4, type === 'channel_mutiple_open' ? 'end' : 'center')
          : $translate('app.labels.unknown')}
      {:else if secondary.type === 'unknown'}
        {secondary.value ? truncateValue(secondary.value, 4) : $translate('app.labels.unknown')}
      {/if}
    </span>
  </div>

  <div class="flex items-center gap-x-1" class:justify-center={centered}>
    {#if timestamp}
      <div class="text-[0.75em] font-semibold mt-1">{timestamp}</div>
    {/if}

    {#if network !== 'bitcoin' && displayNetwork}
      <div class="text-xs px-2 py-1 font-semibold bg-neutral-700 rounded-full leading-none">
        {network}
      </div>
    {/if}
  </div>
</div>
