<script lang="ts">
  import Spinner from '$lib/elements/Spinner.svelte'
  import { translate } from '$lib/i18n/translations'
  import warning from '$lib/icons/warning'
  import lightning from '$lib/lightning'
  import type { PageData } from './$types'
  import { goto } from '$app/navigation'
  import Slide from '$lib/elements/Slide.svelte'
  import Summary from '$lib/components/Summary.svelte'
  import { formatMsat, truncateValue } from '$lib/utils'
  import BackButton from '$lib/elements/BackButton.svelte'
  import { BitcoinDenomination, type FiatDenomination } from '$lib/types'

  import type {
    DecodedBolt12Invoice,
    DecodedBolt12InvoiceRequest,
    DecodedBolt12Offer,
    DecodedCommon,
    OfferCommon
  } from '$lib/backends'
  import { lastPath$ } from '$lib/streams'
  import SummaryRow from '$lib/elements/SummaryRow.svelte'
  import Button from '$lib/elements/Button.svelte'
  import arrow from '$lib/icons/arrow'

  export let data: PageData

  const lnApi = lightning.getLn()

  let loading = true
  let decodeError = ''

  let offerInvalid = false
  let offerType: DecodedCommon['type']
  let offerExpiry: OfferCommon['offer_absolute_expiry']
  let recurrence: OfferCommon['offer_recurrence'] | null = null
  let denomination: BitcoinDenomination.msats | FiatDenomination
  let amount: string | number
  let description: OfferCommon['offer_description']
  let nodeId: OfferCommon['offer_node_id']
  let issuer: OfferCommon['offer_issuer']
  let quantityMax: OfferCommon['offer_quantity_max']

  decodeBolt12()

  async function decodeBolt12() {
    try {
      const decoded: DecodedBolt12Offer | DecodedBolt12InvoiceRequest | DecodedBolt12Invoice =
        await lnApi.decode(data.bolt12)
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
      denomination =
        (offer_currency?.toLowerCase() as FiatDenomination) || BitcoinDenomination.msats
      amount = offer_amount || (offer_amount_msat ? formatMsat(offer_amount_msat) : 'any')
      description = offer_description
      nodeId = offer_node_id
      issuer = offer_issuer
      quantityMax = offer_quantity_max
    } catch (error) {
      const { message } = error as { message: string }
      decodeError = message
    } finally {
      loading = false
    }
  }

  type Slides = typeof slides
  type SlideStep = Slides[number]
  type SlideDirection = 'right' | 'left'

  const slides = ['offer', 'amount', 'note', 'summary'] as const
  let slide: SlideStep = 'offer'
  let previousSlide: SlideStep = 'offer'

  $: slideDirection = (
    slides.indexOf(previousSlide) > slides.indexOf(slide) ? 'right' : 'left'
  ) as SlideDirection

  function back() {
    previousSlide = slides[slides.indexOf(slide) - 2]
    slide = slides[slides.indexOf(slide) - 1]
  }

  function next(to = slides[slides.indexOf(slide) + 1]) {
    previousSlide = slide
    slide = to
  }

  function handleNext() {}
  // STUFF TO HANDLE IN UI
  // if type === bolt12 invoice - go straight to summary slide
  // First slide is offer. What type of offer is this, how much etc with next button
  // if amount === 'any' - show amount UI for input
  // if type === 'bolt12 offer' - show description UI for `payer_note` field when fetching invoice
  // if type === 'bolt12 offer' - Show a quantity incrementer that defaults to one. Could show on summary page?
</script>

{#if loading}
  <Spinner />
{:else if decodeError || offerInvalid || !!recurrence}
  <BackButton on:click={() => goto('/')} text={$translate('app.titles.home')} />
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
{:else if slide === 'offer'}
  <Slide
    back={() => goto($lastPath$ || '/')}
    backText={$translate(`app.titles.${$lastPath$ || 'home'}`)}
    direction={slideDirection}
  >
    <section class="flex flex-col justify-center items-start w-full p-6 max-w-lg">
      <h1 class="text-4xl font-bold mb-4">{$translate('app.headings.offer')}</h1>
      <h2 class="text-2xl font-semibold mb-2">{issuer}</h2>

      <p class="text-neutral-600 dark:text-neutral-400 italic">
        {description}
      </p>

      <div class="mt-8 w-full">
        <SummaryRow>
          <!-- <span slot="label">{$translate('app.labels.min_sendable')}:</span>
            <span slot="value"
              >{convertValue({
                value: minSendable.toString(),
                from: BitcoinDenomination.msats,
                to: $settings$.primaryDenomination
              })}
              {$settings$.primaryDenomination}</span
            > -->
        </SummaryRow>

        <SummaryRow>
          <!-- <span slot="label">{$translate('app.labels.max_sendable')}:</span>
            <span slot="value"
              >{convertValue({
                value: maxSendable.toString(),
                from: BitcoinDenomination.msats,
                to: $settings$.primaryDenomination
              })}
              {$settings$.primaryDenomination}</span
            > -->
        </SummaryRow>
      </div>

      <div class="mt-6 w-full">
        <Button text={$translate('app.buttons.next')} on:click={handleNext}>
          <div slot="iconRight" class="w-6 -rotate-90">
            {@html arrow}
          </div>
        </Button>
      </div>
    </section>
  </Slide>
{/if}
