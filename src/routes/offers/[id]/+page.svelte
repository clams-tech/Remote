<script lang="ts">
  import { timer } from 'rxjs'
  import { map } from 'rxjs/operators'
  import Spinner from '$lib/elements/Spinner.svelte'
  import { translate } from '$lib/i18n/translations'
  import warning from '$lib/icons/warning'
  import type { PageData } from './$types'
  import { goto } from '$app/navigation'
  import Slide from '$lib/elements/Slide.svelte'
  import BackButton from '$lib/elements/BackButton.svelte'
  import { offers$ } from '$lib/streams'
  import { decodedOffers$, decodeOffer } from '../utils'
  import type { FormattedDecodedOffer } from '../types'
  import lightning from '$lib/icons/lightning'
  import lightningOutline from '$lib/icons/lightning-outline'
  import { truncateValue } from '$lib/utils'

  export let data: PageData

  let decoding = false
  let decodeError = false

  $: offerSummary = $offers$.data && $offers$.data.find(({ offer_id }) => offer_id === data.id)
  $: offerNotFound = !$offers$.loading && !!$offers$.data && !offerSummary

  let decodedOffer: FormattedDecodedOffer

  $: if (offerSummary) {
    const alreadyDecoded = $decodedOffers$[data.id]

    if (alreadyDecoded) {
      decodedOffer = alreadyDecoded
    } else {
      decoding = true

      decodeOffer(offerSummary.bolt12)
        .then((decoded) => {
          decodedOffer = decoded
        })
        .catch(() => (decodeError = true))
        .finally(() => (decoding = false))
    }
  }

  const timeSeconds$ = timer(0, 1000).pipe(map(() => Date.now() / 1000))
  $: offerExpired =
    decodedOffer && decodedOffer.offerExpiry && decodedOffer.offerExpiry <= $timeSeconds$
</script>

<svelte:head>
  <title>
    {$translate('app.titles./offer')}
  </title>
</svelte:head>

{#if offerSummary}
  {@const { offer_id, label, active, single_use, used, bolt12 } = offerSummary}
  <Slide back={() => goto('/offers')} backText={$translate('app.titles./offers')} direction="left">
    <section class="flex flex-col justify-center items-start w-full p-6 max-w-lg">
      <div class="flex items-center mb-6 mt-12">
        <div class="w-10 mr-2">{@html lightningOutline}</div>
        <h1 class="text-4xl font-bold">
          {$translate('app.titles./offer')}
        </h1>
      </div>

      <div class="grid gap-4 w-full">
        <div class="w-full border rounded-md p-4">
          {#if label}
            <div>{label}</div>
          {/if}
          <div>{truncateValue(offer_id)}</div>
          <div>Active: {active}</div>
          <div>Single use: {single_use}</div>
          <div>Used: {used}</div>
          <div>Bolt12: {truncateValue(bolt12)}</div>
        </div>
      </div>
    </section>
  </Slide>
{/if}
