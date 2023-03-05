<script lang="ts">
  import { timer } from 'rxjs'
  import { map } from 'rxjs/operators'
  import Spinner from '$lib/elements/Spinner.svelte'
  import { translate } from '$lib/i18n/translations'
  import warning from '$lib/icons/warning'
  import lightning from '$lib/lightning'
  import type { PageData } from './$types'
  import { goto } from '$app/navigation'
  import Slide from '$lib/elements/Slide.svelte'
  import { createRandomHex, formatMsat, truncateValue } from '$lib/utils'
  import BackButton from '$lib/elements/BackButton.svelte'
  import { BitcoinDenomination, type FiatDenomination } from '$lib/types'
  import { lastPath$, paymentUpdates$, settings$ } from '$lib/streams'
  import SummaryRow from '$lib/elements/SummaryRow.svelte'
  import Button from '$lib/elements/Button.svelte'
  import arrow from '$lib/icons/arrow'
  import { convertValue } from '$lib/conversion'
  import ExpiryCountdown from '$lib/components/ExpiryCountdown.svelte'
  import Amount from '$lib/components/Amount.svelte'
  import Description from '$lib/components/Description.svelte'
  import Summary from '$lib/components/Summary.svelte'
  import trendingUp from '$lib/icons/trending-up'
  import trendingDown from '$lib/icons/trending-down'
  import ErrorMsg from '$lib/elements/ErrorMsg.svelte'

  import type {
    DecodedBolt12Invoice,
    DecodedBolt12InvoiceRequest,
    DecodedBolt12Offer,
    DecodedCommon,
    OfferCommon
  } from '$lib/backends'

  export let data: PageData

  const lnApi = lightning.getLn()

  let loading = true
  let decodeError = ''

  let offerInvalid = false
  let offerType: DecodedCommon['type']
  let offerExpiry: OfferCommon['offer_absolute_expiry']
  let recurrence: OfferCommon['offer_recurrence'] | null = null
  let denomination: BitcoinDenomination.msats | FiatDenomination
  let amountMsat: string | number
  let description: OfferCommon['offer_description']
  let nodeId: OfferCommon['offer_node_id']
  let issuer: OfferCommon['offer_issuer']
  let quantityMax: OfferCommon['offer_quantity_max']

  // @TODO - check if we already have decoded info for this offer by looking up in state
  // if don't already have decoded info, then decode
  // decodeBolt12()

  // @TODO - move this in to a utils file under the offers folder
  async function decodeBolt12() {
    try {
      const decoded: DecodedBolt12Offer | DecodedBolt12InvoiceRequest | DecodedBolt12Invoice =
        await lnApi.decode(data.offer)

      const {
        valid,
        type,
        offer_recurrence,
        offer_currency,
        offer_amount,
        offer_amount_msat,
        offer_description,
        offer_node_id,
        offer_issuer,
        offer_absolute_expiry,
        offer_quantity_max
      } = decoded

      offerInvalid = !valid
      offerType = type
      offerExpiry = offer_absolute_expiry
      recurrence = offer_recurrence || null
      description = offer_description
      issuer = offer_issuer

      if (offerType === 'bolt12 invoice_request') {
        const { invreq_amount_msat, invreq_payer_id } = decoded as DecodedBolt12InvoiceRequest
        denomination = BitcoinDenomination.msats
        amountMsat = formatMsat(invreq_amount_msat as string)
        nodeId = invreq_payer_id
        quantityMax = offer_quantity_max
      }

      if (offerType === 'bolt12 offer' || offerType === 'bolt12 invoice') {
        const { invreq_amount_msat } = decoded as DecodedBolt12Invoice

        denomination =
          (offer_currency?.toLowerCase() as FiatDenomination) || BitcoinDenomination.msats

        amountMsat = offer_amount || formatMsat((offer_amount_msat || invreq_amount_msat) as string)
        nodeId = offer_node_id
        quantityMax = offer_quantity_max
      }
    } catch (error) {
      const { message } = error as { message: string }
      decodeError = message
    } finally {
      loading = false
    }
  }

  const timeSeconds$ = timer(0, 1000).pipe(map(() => Date.now() / 1000))
  $: offerExpired = !!offerExpiry && offerExpiry <= $timeSeconds$
</script>

<svelte:head>
  <title>
    {$translate('app.titles./offer')}
  </title>
</svelte:head>

{#if loading}
  <Spinner />
{:else if decodeError || offerInvalid || !!recurrence}
  <BackButton on:click={() => goto($lastPath$)} text={$translate(`app.titles.${$lastPath$}`)} />
  <section class="w-full p-6 max-w-lg flex items-center justify-center">
    <div class="flex text-utility-error">
      <div class="w-4 mr-2">{@html warning}</div>
      <p>
        {$translate(
          `app.errors.bolt12_${
            decodeError ? 'decode_error' : offerInvalid ? 'invalid' : 'recurrence_unsupported'
          }`
        )}
      </p>
    </div>
  </section>
{:else}
  <Slide
    back={() => goto($lastPath$ || '/')}
    backText={$translate(`app.titles.${$lastPath$ || '/'}`)}
    direction={'left'}
  >
    <!-- @TODO - Render detail view of offer with action items like disabling etc -->
  </Slide>
{/if}
