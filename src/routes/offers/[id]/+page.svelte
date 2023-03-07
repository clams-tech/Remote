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

  $: offerSummary = $offers$.data && $offers$.data.find(({ id }) => id === data.id)
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
          $decodedOffers$[data.id] = decodedOffer
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

{#if offerNotFound}
  <BackButton on:click={() => goto('/offers')} text={$translate('app.titles./offers')} />
  <section class="w-full p-6 max-w-lg flex items-center justify-center">
    <div class="flex items-center mb-6 mt-12">
      <div class="w-10 mr-2">{@html lightningOutline}</div>
      <h1 class="text-4xl font-bold">
        {$translate('app.titles./offers')}
      </h1>
    </div>
    <div class="flex text-utility-error">
      <div class="w-4 mr-2">{@html warning}</div>
      <p>
        {$translate('app.errors.offer_not_found')}
      </p>
    </div>
  </section>
{:else if offerSummary}
  {@const { id, label, active, single_use, used, bolt12 } = offerSummary}
  <Slide back={() => goto('/offers')} backText={$translate('app.titles./offers')} direction="left">
    <section class="flex flex-col justify-center items-start w-full p-6 max-w-lg">
      <div class="flex items-center mb-6 mt-12">
        <div class="w-10 mr-2">{@html lightningOutline}</div>
        <h1 class="text-4xl font-bold">
          {$translate('app.titles./offer')}
          {#if label}
            {' - ' + label}
          {/if}
        </h1>
      </div>

      <!-- @TODO - COULD USE SOMETHING LIKE <PaymentDetails {payment} /> for summary? -->

      <div class="grid gap-4 w-full">
        <div class="w-full border rounded-md p-4">
          <div>{truncateValue(id)}</div>
          <div>Active: {active}</div>
          <div>Single use: {single_use}</div>
          <div>Used: {used}</div>
          <div>Bolt12: {truncateValue(bolt12)}</div>
        </div>
      </div>
    </section>
  </Slide>
{/if}
