<script lang="ts">
  import Amount from '$lib/components/Amount.svelte'
  import TextScreen from '$lib/components/TextScreen.svelte'
  import Summary from '$lib/components/Summary.svelte'
  import { convertValue } from '$lib/conversion'
  import { goto } from '$app/navigation'
  import { BitcoinDenomination } from '$lib/types'
  import Slide from '$lib/elements/Slide.svelte'
  import ErrorMsg from '$lib/elements/ErrorMsg.svelte'
  import { translate } from '$lib/i18n/translations'
  import lightning from '$lib/lightning'
  import { createRandomHex } from '$lib/utils'
  import { listeningForAllInvoiceUpdates$, paymentUpdates$, settings$ } from '$lib/streams'

  const { invoiceExpiry } = $settings$

  let requesting = false
  let receiveError = ''

  type Slides = typeof slides
  type SlideStep = Slides[number]
  type SlideDirection = 'right' | 'left'

  const slides = ['amount', 'description', 'summary'] as const
  let slide: SlideStep = 'amount'
  let previousSlide: SlideStep = 'amount'

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

  let value = ''
  let description = ''
  let expiry = invoiceExpiry

  async function submit() {
    receiveError = ''

    const amount_msat = convertValue({
      value: value || 'any',
      from: settings$.value.primaryDenomination,
      to: BitcoinDenomination.msats
    })

    if (!amount_msat) {
      receiveError = $translate('app.errors.-1')
      return
    }

    try {
      requesting = true

      const lnApi = lightning.getLn()

      const payment = await lnApi.createInvoice({
        amount_msat: amount_msat === '0' ? 'any' : amount_msat,
        description,
        expiry,
        label: createRandomHex()
      })

      // add to payments
      paymentUpdates$.next(payment)

      if (!$listeningForAllInvoiceUpdates$) {
        // track invoice payment
        lightning.waitForAndUpdatePayment(payment)
      }

      // route to payment route
      goto(`/payments/${payment.id}`)
    } catch (error) {
      requesting = false

      const { code, message } = error as { code: number; message: string }

      receiveError =
        code === -32602 ? message : $translate(`app.errors.${code}`, { default: message })
    }
  }
</script>

<svelte:head>
  <title>{$translate('app.titles./receive')}</title>
</svelte:head>

{#if slide === 'amount'}
  <Slide
    back={() => {
      goto('/')
    }}
    backText={$translate('app.titles./')}
    direction={slideDirection}
  >
    <Amount bind:value {next} direction="receive" hint={$translate('app.hints.any_amount')} />
  </Slide>
{/if}

{#if slide === 'description'}
  <Slide {back} backText={$translate(`app.labels.${previousSlide}`)} direction={slideDirection}>
    <TextScreen
      bind:value={description}
      label="description"
      {next}
      hint={$translate('app.labels.optional')}
    />
  </Slide>
{/if}

{#if slide === 'summary'}
  <Slide {back} backText={$translate(`app.labels.${previousSlide}`)} direction={slideDirection}>
    <Summary
      paymentType="bolt11"
      paymentAction="create"
      {value}
      {description}
      bind:expiry
      direction="receive"
      {requesting}
      on:complete={submit}
    />
  </Slide>
{/if}

<div class="absolute bottom-0 p-4">
  <ErrorMsg bind:message={receiveError} />
</div>
