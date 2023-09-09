<script lang="ts">
  import { DAY_IN_SECS, HOUR_IN_SECS, MIN_IN_SECS } from '$lib/constants.js'
  import { translate } from '$lib/i18n/translations.js'

  export let allowNeverExpire = false
  export let expiry: number | undefined = allowNeverExpire ? undefined : 7 * DAY_IN_SECS

  const options = [
    { label: $translate('app.labels.never'), value: undefined },
    { label: $translate('app.labels.quarter_hour'), value: 15 * MIN_IN_SECS },
    { label: $translate('app.labels.hour'), value: HOUR_IN_SECS },
    { label: $translate('app.labels.day'), value: DAY_IN_SECS },
    { label: $translate('app.labels.three_days'), value: 3 * DAY_IN_SECS },
    { label: $translate('app.labels.week'), value: 7 * DAY_IN_SECS }
  ]
</script>

<div class="w-full">
  <div class="mb-2 text-neutral-300 font-semibold text-sm">
    {$translate('app.labels.expires')}
  </div>

  <div class="flex flex-wrap w-full gap-2 p-4 border border-neutral-600 rounded bg-neutral-900">
    {#each options as { label, value }}
      <button
        class="px-3 py-2 rounded-xl border-2 transition-colors hover:bg-neutral-800"
        class:border-neutral-50={expiry !== value}
        class:border-purple-300={expiry === value}
        on:click={() => (expiry = value)}
      >
        <div class="font-semibold">{label}</div>
      </button>
    {/each}
  </div>
</div>
