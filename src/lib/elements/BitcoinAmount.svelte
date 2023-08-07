<script lang="ts">
  import { msatsToBtc } from '$lib/conversion.js'
  import { translate } from '$lib/i18n/translations.js'
  import bitcoin from '$lib/icons/bitcoin.js'
  import Big from 'big.js'

  export let msat: string

  // convert to btc
  $: btc = msatsToBtc(msat)

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

  $: bigMsat = msat !== 'any' ? Big(msat) : null
  $: displayMsat = bigMsat && bigMsat.gt(0) && bigMsat.lt(1000)
</script>

<div class="flex items-center">
  {#if !displayMsat}
    <div class="w-[1.25em] text-neutral-50 -ml-1">{@html bitcoin}</div>
  {/if}

  <div class="flex">
    <div class="mr-[0.375em] font-mono leading-snug">{@html displayMsat ? msat : formattedBtc}</div>
    <div
      class="text-[0.75em] font-semibold text-neutral-50 flex items-end leading-none pb-[0.25em]"
    >
      {$translate(`app.labels.${displayMsat ? 'msat' : 'sats'}`).toLowerCase()}
    </div>
  </div>
</div>
