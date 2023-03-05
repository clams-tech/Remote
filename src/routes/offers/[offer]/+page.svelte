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

  let completing = false
  let completionError = ''

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

  // manual input value if amountMsat === 'any'
  let value: string

  // optional payer not to include with payment
  let payerNote: string

  decodeBolt12()

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

  type Slides = typeof slides
  type SlideStep = Slides[number]
  type SlideDirection = 'right' | 'left'

  const slides = ['offer', 'amount', 'note', 'summary'] as const
  let slide: SlideStep = 'offer'
  let previousSlide: SlideStep = 'offer'
  let slideDirection: SlideDirection = 'left'

  function back() {
    slideDirection = 'right'
    previousSlide = slide
    slide = slides[slides.indexOf(slide) - 1]
  }

  function next(to = slides[slides.indexOf(slide) + 1]) {
    slideDirection = slides.indexOf(slide) > slides.indexOf(to) ? 'right' : 'left'
    previousSlide = slide
    slide = to
  }

  function handleNext() {
    // invoice and invoice request type do not need a payer note
    // so are ready to finalize
    if (offerType === 'bolt12 invoice' || offerType === 'bolt12 invoice_request') {
      complete()
      return
    }

    if (amountMsat === 'any') {
      next('amount')
    } else {
      next('note')
    }
  }

  async function complete() {
    completing = true

    let payment

    try {
      if (offerType === 'bolt12 invoice') {
        payment = await lnApi.payInvoice({
          invoice: data.offer,
          type: 'bolt12',
          id: createRandomHex()
        })
      } else if (offerType === 'bolt12 offer') {
        const {
          changes,
          invoice
          // next_period
        } = await lnApi.fetchInvoice({
          offer: data.offer,
          amount_msat:
            amountMsat === 'any'
              ? (convertValue({
                  value,
                  from: $settings$.primaryDenomination,
                  to: BitcoinDenomination.msats
                }) as string)
              : undefined,
          payer_note: payerNote
        })

        if (changes && Object.keys(changes).length) {
          // @TODO - show additional UI that displays changes, could be a modal?
          console.log({ changes })
        } else {
          payment = await lnApi.payInvoice({ invoice, type: 'bolt12', id: createRandomHex() })
        }
      } else if (offerType === 'bolt12 invoice_request') {
        payment = await lnApi.sendInvoice({
          offer: data.offer,
          label: createRandomHex(),
          amount_msat: amountMsat === 'any' ? value : undefined
        })
      }
    } catch (error) {
      const { code, message } = error as { code: number; message: string }
      completionError = message
    } finally {
      completing = false

      if (payment) {
        paymentUpdates$.next(payment)

        // delay to allow time for node to update
        if (offerType !== 'bolt12 invoice_request') {
          setTimeout(() => lightning.updateFunds(), 1000)
        }

        await goto(`/payments/${payment.id}`)
      }
    }
  }
</script>

<svelte:head>
  <title>
    {$translate('app.titles./offer')}
  </title>
</svelte:head>

{#if loading}
  <Spinner />
{:else if decodeError || offerInvalid || !!recurrence}
  <BackButton on:click={() => goto('/')} text={$translate('app.titles./')} />
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
    backText={$translate(`app.titles.${$lastPath$}`)}
    direction={slideDirection}
  >
    <section class="flex flex-col justify-center items-start w-full p-6 max-w-lg">
      <h1 class="text-4xl font-bold">{$translate('app.headings.offer')}</h1>

      <div class="mt-6 w-full">
        <SummaryRow>
          <span slot="label">{$translate('app.labels.issuer')}:</span>
          <span slot="value">{issuer || truncateValue(nodeId)}</span>
        </SummaryRow>

        <SummaryRow>
          <span slot="label">{$translate('app.labels.offer_type')}:</span>
          <span slot="value" class="flex items-center"
            >{$translate('app.labels.offer_type_value', { offerType })}
            <div
              class:text-utility-success={offerType === 'bolt12 invoice_request'}
              class:text-utility-pending={offerType !== 'bolt12 invoice_request'}
              class="w-6 ml-2"
            >
              {@html offerType === 'bolt12 invoice_request' ? trendingUp : trendingDown}
            </div></span
          >
        </SummaryRow>

        <SummaryRow>
          <span slot="label">{$translate('app.labels.description')}:</span>
          <span slot="value">{description}</span>
        </SummaryRow>

        <SummaryRow>
          <span slot="label">{$translate('app.labels.amount')}:</span>
          <span slot="value">
            {#if amountMsat === 'any'}
              {$translate('app.labels.any')}
            {:else}
              {convertValue({
                value: amountMsat.toString(),
                from: denomination,
                to: $settings$.primaryDenomination
              })}
              {$settings$.primaryDenomination}
            {/if}
          </span>
        </SummaryRow>

        {#if offerExpiry}
          <SummaryRow>
            <span slot="label"
              >{$translate(`app.labels.${offerExpired ? 'expired' : 'expires'}`)}:</span
            >
            <span slot="value"
              ><ExpiryCountdown
                small={false}
                label={false}
                expiry={new Date(offerExpiry * 1000)}
              /></span
            >
          </SummaryRow>
        {/if}
      </div>

      <div class="mt-6 w-full">
        <Button
          text={$translate(
            `app.${
              offerType === 'bolt12 invoice'
                ? 'labels.pay'
                : offerType === 'bolt12 invoice_request'
                ? 'labels.withdraw'
                : 'buttons.next'
            }`
          )}
          requesting={completing}
          on:click={handleNext}
          disabled={offerExpired}
        >
          <div slot="iconRight">
            {#if offerType === 'bolt12 offer'}
              <div class="w-6 -rotate-90">
                {@html arrow}
              </div>
            {/if}
          </div>
        </Button>
      </div>
    </section>
  </Slide>
{:else if slide === 'amount'}
  <Slide {back} backText={$translate(`app.labels.${previousSlide}`)} direction={slideDirection}>
    <Amount bind:value {next} direction="send" required />
  </Slide>
{:else if slide === 'note'}
  <Slide
    back={() => (amountMsat === 'any' ? back() : next('offer'))}
    backText={$translate(`app.labels.${amountMsat === 'any' ? previousSlide : 'offer'}`)}
    direction={slideDirection}
  >
    <Description bind:description={payerNote} {next} headingsKey="payer_note" />
  </Slide>
{:else if slide === 'summary'}
  <Slide {back} backText={$translate(`app.labels.${previousSlide}`)} direction={slideDirection}>
    <Summary
      type="bolt12"
      destination={truncateValue(nodeId)}
      {issuer}
      direction={offerType === 'bolt12 invoice_request' ? 'receive' : 'send'}
      value={amountMsat === 'any'
        ? value
        : convertValue({
            value: amountMsat.toString(),
            from: BitcoinDenomination.msats,
            to: $settings$.primaryDenomination
          })}
      {description}
      expiry={offerExpiry || null}
      requesting={completing}
      on:complete={complete}
    />
    <!-- @TODO - if type === 'bolt12 offer' - Show a quantity incrementer that defaults to one -->
  </Slide>
{/if}

<div class="absolute bottom-0 p-4">
  <ErrorMsg bind:message={completionError} />
</div>
