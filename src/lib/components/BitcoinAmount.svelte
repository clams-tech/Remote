<script lang="ts">
  import { satsToBtcString, satsToMsats } from '$lib/conversion.js'
  import { translate } from '$lib/i18n/translations.js'
  import bitcoin from '$lib/icons/bitcoin.js'

  export let sats: number

  // convert to btc
  $: btc = satsToBtcString(sats)

  $: formattedBtc = btc.split('').reduce((formatted, val, index) => {
    const active =
      formatted.includes('neutral-50') ||
      (val !== '.' && Number(val) > 0) ||
      index === btc.length - 1
    const marginRight = index === 3 || index === 6

    return `${formatted}<span class="${active ? 'text-neutral-50' : 'text-neutral-400'} ${
      marginRight ? 'mr-[0.25em]' : 'mr-0'
    }">${val}</span>`
  }, '')

  $: displayMsat = sats > 0 && sats < 1
</script>

<div class="flex items-center">
  {#if !displayMsat}
    <div class="w-[1.25em] text-neutral-50 -ml-1">{@html bitcoin}</div>
  {/if}

  <div class="flex">
    <div class="mr-[0.375em] font-mono leading-snug">
      {@html displayMsat ? satsToMsats(sats) : formattedBtc}
    </div>
    <div class="text-[0.75em] text-neutral-50 flex items-end leading-none pb-[0.25em]">
      {$translate(`app.labels.${displayMsat ? 'msat' : 'sats'}`).toLowerCase()}
    </div>
  </div>
</div>
