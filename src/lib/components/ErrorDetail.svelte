<script lang="ts">
  import type { AppError } from '$lib/@types/errors.js'
  import { formatDateRelativeToNow } from '$lib/dates.js'
  import Msg from '$lib/components/Msg.svelte'
  import SummaryRow from '$lib/components/SummaryRow.svelte'
  import { translate } from '$lib/i18n/translations.js'
  import ShowMoar from './ShowMoar.svelte'

  export let error: AppError

  const {
    key,
    detail: { context, message, timestamp }
  } = error
</script>

<Msg type="error" message={$translate(`app.errors.${key}`)} closable={false}>
  <div class="w-full text-neutral-300 text-sm font-normal mt-4">
    <ShowMoar label={$translate('app.labels.details')}>
      <SummaryRow>
        <div slot="label">{$translate('app.labels.timestamp')}:</div>
        <div slot="value">
          {#await formatDateRelativeToNow(timestamp) then date}
            {date}
          {/await}
        </div>
      </SummaryRow>

      <SummaryRow>
        <div slot="label">{$translate('app.labels.context')}:</div>
        <div slot="value">
          {context}
        </div>
      </SummaryRow>

      <SummaryRow baseline>
        <div slot="label">{$translate('app.labels.error')}:</div>
        <div slot="value">
          {message}
        </div>
      </SummaryRow>
    </ShowMoar>
  </div>
</Msg>
