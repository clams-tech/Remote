<script lang="ts">
  import type { AppError } from '$lib/@types/errors.js'
  import { formatDateRelativeToNow } from '$lib/dates.js'
  import Msg from '$lib/components/Msg.svelte'
  import SummaryRow from '$lib/components/SummaryRow.svelte'
  import { translate } from '$lib/i18n/translations.js'
  import caret from '$lib/icons/caret.js'
  import { slide } from 'svelte/transition'

  export let error: AppError

  const {
    key,
    detail: { context, message, timestamp }
  } = error

  let showDetail = false
</script>

<Msg type="error" message={$translate(`app.errors.${key}`)} closable={false}>
  <div class="w-full text-neutral-50">
    <button
      on:click={() => (showDetail = !showDetail)}
      class="mt-4 flex items-center text-sm cursor-pointer"
    >
      <div class:-rotate-90={!showDetail} class="w-3 mr-1 transition-transform">
        {@html caret}
      </div>

      <span class="underline">{$translate('app.labels.details')}</span>
    </button>

    {#if showDetail}
      <div
        transition:slide={{ duration: 250 }}
        class="text-sm mt-2 pl-4 pr-[1px] flex flex-col items-start"
      >
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
      </div>
    {/if}
  </div>
</Msg>
