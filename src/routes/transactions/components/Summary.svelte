<script lang="ts">
  import { formatDate } from '$lib/dates.js'
  import { translate } from '$lib/i18n/translations.js'
  import type { TransactionSummary } from '$lib/summary.js'
  import { truncateValue } from '$lib/utils.js'

  export let primary: TransactionSummary['primary']
  export let type: TransactionSummary['type']
  export let secondary: TransactionSummary['secondary']
  export let timestamp: TransactionSummary['timestamp'] = 0
</script>

<div>
  <div>
    <span class="font-semibold text-purple-100">
      {primary ? truncateValue(primary, 12) : $translate('app.labels.unknown')}
    </span>
    <span class="italic">
      {$translate(`app.labels.summary_${type}`)}
    </span>

    <span class="font-semibold text-purple-100">
      {secondary
        ? truncateValue(secondary, 12, type === 'channel_mutiple_open' ? 'end' : 'center')
        : $translate('app.labels.unknown')}
    </span>
  </div>

  {#if timestamp}
    {#await formatDate(timestamp, 'hh:mma') then formattedTime}
      <div class="text-[0.75em] font-semibold mt-1">{formattedTime}</div>
    {/await}
  {/if}
</div>
