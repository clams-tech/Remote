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
  import { offers$, decodedOffers$, offersPayments$ } from '$lib/streams'
  import type { FormattedDecodedOffer } from '$lib/types'
  import lightningOutline from '$lib/icons/lightning-outline'
  import { truncateValue, formatDecodedOffer } from '$lib/utils'
  import lightning from '$lib/lightning'

  export let data: PageData

  const lnApi = lightning.getLn()
  const timeSeconds$ = timer(0, 1000).pipe(map(() => Date.now() / 1000))

  let decoding = false
  let decodeError = false
  let decodedOffer: FormattedDecodedOffer

  $: offerSummary = $offers$.data && $offers$.data.find(({ id }) => id === data.id)
  $: offerNotFound = !$offers$.loading && !!$offers$.data && !offerSummary

  $: offerExpired =
    decodedOffer && decodedOffer.offerExpiry && decodedOffer.offerExpiry <= $timeSeconds$

  $: if (offerSummary) {
    checkForDecoded()
  }

  $: offerPayments = $offersPayments$[data.id]

  async function checkForDecoded() {
    const alreadyDecoded = $decodedOffers$[data.id]

    try {
      if (alreadyDecoded) {
        decodedOffer = alreadyDecoded
      } else {
        decoding = true
        const decoded = await lnApi.decode(offerSummary!.bolt12)
        decodedOffer = formatDecodedOffer(decoded)
      }
    } catch (error) {
      decodeError = true
    } finally {
      decoding = false
    }
  }

  $: console.log({ offerPayments })
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
{:else if decoding || !offerSummary}
  <Spinner />
{:else}
  {@const { id, label, active, single_use, used, bolt12 } = offerSummary}
  {@const { amountMsat, denomination, description, nodeId, issuer, quantityMax, recurrence } =
    decodedOffer}
  <!-- offerExpired -->
  <!-- offerPayments -->

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
