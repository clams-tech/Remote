<script lang="ts">
  import { msatsToBtc } from '$lib/conversion.js'
  import { translate } from '$lib/i18n/translations.js'
  import bitcoin from '$lib/icons/bitcoin.js'
  import Big from 'big.js'

  export let msat: string

  // convert to btc
  $: btc = msatsToBtc(msat)

  $: formattedBtc = btc.split('').reduce((formatted, val, index) => {
    const active = formatted.includes('neutral-50') || (val !== '.' && Number(val) > 0)
    const marginRight = index === 3 || index === 6

    return `${formatted}<span class="${active ? 'text-neutral-50' : 'text-neutral-400'} ${
      marginRight ? 'mr-[0.25em]' : 'mr-0'
    }">${val}</span>`
  }, '')
</script>

<div class="flex items-center">
  <div class="w-[1.25em] text-neutral-50">{@html bitcoin}</div>
  <div class="flex items-baseline mt-0.5">
    <div class="mr-[0.375em] font-mono">{@html formattedBtc}</div>
    <div class="text-[0.8em] text-neutral-50">
      {$translate('app.labels.sats').toLowerCase()}
    </div>
  </div>
</div>
