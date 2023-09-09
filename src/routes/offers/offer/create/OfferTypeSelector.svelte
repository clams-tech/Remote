<script lang="ts">
  import { translate } from '$lib/i18n/translations.js'
  import trendingDown from '$lib/icons/trending-down.js'
  import trendingUp from '$lib/icons/trending-up.js'

  export let type: 'pay' | 'withdraw' = 'pay'
</script>

<div class="w-full">
  <div class="mb-2 text-neutral-300 font-semibold text-sm">
    {$translate('app.labels.offer_type')}
  </div>

  <div class="flex w-full gap-x-2 p-4 border border-neutral-600 rounded bg-neutral-900">
    <button
      class="px-3 py-2 rounded-xl border-2 transition-colors hover:bg-neutral-800 w-1/2"
      class:border-neutral-50={type !== 'pay'}
      class:border-purple-300={type === 'pay'}
      on:click={() => (type = 'pay')}
    >
      <div class="flex items-center">
        <div class="w-4 mr-1 text-utility-success">{@html trendingUp}</div>
        <div class="font-semibold leading-tight">{$translate('app.labels.pay')}</div>
      </div>
      <div class="text-xs">{$translate('app.labels.pay_offer_description')}</div>
    </button>

    <button
      class="px-3 py-2 rounded-xl border-2 transition-colors hover:bg-neutral-800 w-1/2"
      class:border-neutral-50={type !== 'withdraw'}
      class:border-purple-300={type === 'withdraw'}
      on:click={() => (type = 'withdraw')}
    >
      <div class="flex items-center">
        <div class="w-4 mr-1 text-utility-error">{@html trendingDown}</div>
        <div class="font-semibold leading-tight">{$translate('app.labels.withdraw')}</div>
      </div>
      <div class="text-xs">{$translate('app.labels.withdraw_offer_description')}</div>
    </button>
  </div>
</div>
