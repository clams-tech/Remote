<script lang="ts">
  import Amount from '$lib/components/Amount.svelte'
  import Description from '$lib/components/Description.svelte'
  import Summary from '$lib/components/Summary.svelte'
  import { convertValue } from '$lib/conversion'
  import { goto } from '$app/navigation'
  import { BitcoinDenomination } from '$lib/types'
  import Slide from '$lib/elements/Slide.svelte'
  import ErrorMsg from '$lib/elements/ErrorMsg.svelte'
  import { translate } from '$lib/i18n/translations'
  import lightning from '$lib/lightning'
  import { createRandomHex } from '$lib/utils'

  import {
    listeningForAllInvoiceUpdates$,
    paymentUpdates$,
    settings$,
    SvelteSubject
  } from '$lib/streams'

  let requesting = false

  const { invoiceExpiry } = $settings$

  let previousSlide = 0
  let slide = 0

  let receiveError = ''

  function next() {
    previousSlide = slide
    slide = slide + 1
  }

  function prev() {
    previousSlide = slide
    slide = slide - 1
  }

  const receivePayment$ = new SvelteSubject({
    value: '',
    description: '',
    expiry: invoiceExpiry
  })

  async function submit() {
    receiveError = ''
    const { value, description, expiry } = $receivePayment$

    const amount_msat = convertValue({
      value,
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
  <title>{$translate('app.titles.receive')}</title>
</svelte:head>

{#if slide === 0}
  <Slide
    back={() => {
      goto('/')
    }}
    direction={previousSlide > slide ? 'right' : 'left'}
  >
    <Amount bind:value={$receivePayment$.value} {next} direction="receive" />
  </Slide>
{/if}

{#if slide === 1}
  <Slide back={prev} direction={previousSlide > slide ? 'right' : 'left'}>
    <Description bind:description={$receivePayment$.description} {next} />
  </Slide>
{/if}

{#if slide === 2}
  <Slide back={prev} direction={previousSlide > slide ? 'right' : 'left'}>
    <Summary
      type="payment_request"
      value={$receivePayment$.value}
      description={$receivePayment$.description}
      bind:expiry={$receivePayment$.expiry}
      direction="receive"
      {requesting}
      on:complete={submit}
    />
  </Slide>
{/if}

<div class="absolute bottom-0 p-4">
  <ErrorMsg bind:message={receiveError} />
</div>
