<script lang="ts">
  import { msatsToBtc } from '$lib/conversion.js'
  import bitcoin from '$lib/icons/bitcoin.js'

  export let msat: string

  // convert to btc
  $: btc = msatsToBtc(msat)

  $: formattedBtc = btc.split('').reduce((formatted, val, index) => {
    const active = formatted.includes('neutral-50') || (val !== '.' && Number(val) > 0)
    const marginRight = index === 3 || index === 6

    return `${formatted}<span class="${active ? 'text-neutral-50' : 'text-neutral-400'} ${
      marginRight ? 'mr-1' : 'mr-0'
    }">${val}</span>`
  }, '')
</script>

<div class="flex items-center">
  <div class="w-[1em]">{@html bitcoin}</div>
  <div class="flex items-baseline mt-0.5">
    <div class="mr-1.5 font-mono">{@html formattedBtc}</div>
    <div class="text-[0.8em]">sats</div>
  </div>
</div>
