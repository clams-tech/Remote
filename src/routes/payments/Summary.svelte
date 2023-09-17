<script lang="ts">
  import type { Network, PaymentStatus } from '$lib/@types/common.js'
  import { formatDate } from '$lib/dates.js'
  import { translate } from '$lib/i18n/translations.js'
  import type { PaymentSummary } from '$lib/summary.js'
  import { truncateValue } from '$lib/utils.js'

  export let primary: PaymentSummary['primary']
  export let type: PaymentSummary['type']
  export let secondary: PaymentSummary['secondary']
  export let status: PaymentStatus
  export let timestamp: PaymentSummary['timestamp'] = 0
  export let network: Network
  export let centered = false
  export let displayNetwork = false
</script>

<div>
  <div>
    <span class="font-semibold text-purple-100">
      {primary
        ? truncateValue(primary, 6).toUpperCase()
        : $translate('app.labels.unknown').toUpperCase()}
    </span>
    <span class="italic">
      {$translate(`app.labels.summary_${type}_${status}`)}
    </span>

    <span class="font-semibold text-purple-100">
      {secondary
        ? truncateValue(
            secondary,
            6,
            type === 'channel_mutiple_open' ? 'end' : 'center'
          ).toUpperCase()
        : $translate('app.labels.unknown').toUpperCase()}
    </span>
  </div>

  <div class="flex items-center gap-x-1" class:justify-center={centered}>
    {#if timestamp}
      {#await formatDate(timestamp, 'hh:mma') then formattedTime}
        <div class="text-[0.75em] font-semibold mt-1">{formattedTime}</div>
      {/await}
    {/if}

    {#if network !== 'bitcoin' && displayNetwork}
      <div class="text-xs px-2 py-1 font-semibold bg-neutral-700 rounded-full leading-none">
        {network}
      </div>
    {/if}
  </div>
</div>
