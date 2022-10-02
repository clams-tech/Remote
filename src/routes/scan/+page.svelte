<script lang="ts">
  import Scanner from '$lib/components/Scanner.svelte'
  import { goto } from '$app/navigation'
  import { decode } from 'light-bolt11-decoder'
  import Slide from '$lib/elements/Slide.svelte'
  import Summary from '$lib/components/Summary.svelte'
  import ErrorMsg from '$lib/elements/ErrorMsg.svelte'
  import { BitcoinDenomination, type Payment } from '$lib/types'
  import { paymentUpdates$, settings$, SvelteSubject } from '$lib/streams'
  import { translate } from '$lib/i18n/translations'
  import { coreLn, type ErrorResponse } from '$lib/backends'
  import { formatDecodedInvoice } from '$lib/utils'
  import { convertValue } from '$lib/conversion'

  let requesting = false
  let errorMsg = ''

  const sendPayment$ = new SvelteSubject<
    Pick<Payment, 'bolt11' | 'description' | 'value'> & {
      expiry: number | null
      timestamp: number | null
    }
  >({
    bolt11: '',
    description: '',
    expiry: null,
    value: '0',
    timestamp: null
  })

  $: value = convertValue({
    value: $sendPayment$.value,
    from: BitcoinDenomination.msats,
    to: $settings$.primaryDenomination
  })

  function handleScanResult(scanResult: string) {
    let invoice: string

    if (scanResult.includes(':')) {
      invoice = scanResult.split(':')[1]
    } else {
      invoice = scanResult
    }

    if (!invoice) {
      errorMsg = $translate('app.errors.invalid_invoice')
      return
    }

    try {
      const decodedInvoice = decode(invoice)
      const { paymentRequest, description, expiry, amount, timestamp } =
        formatDecodedInvoice(decodedInvoice)

      sendPayment$.next({
        bolt11: paymentRequest,
        description,
        expiry: expiry || 3600,
        value: amount,
        timestamp
      })

      next()
    } catch (error) {
      errorMsg = $translate('app.errors.invalid_invoice')
    }
  }

  async function sendPayment() {
    const { bolt11, description } = sendPayment$.getValue()

    errorMsg = ''
    requesting = true

    const id = crypto.randomUUID()

    try {
      const payment = await coreLn.payInvoice({ bolt11: bolt11 as string, id })
      paymentUpdates$.next({ ...payment, description })
      goto(`/payments/${payment.id}`)
    } catch (error) {
      const { code, message } = error as ErrorResponse
      errorMsg = $translate(`app.errors.${code}`, { default: message })
    } finally {
      requesting = false
    }
  }

  let previousSlide = 0
  let slide = 0

  function next() {
    if (slide === 1) return
    previousSlide = slide
    slide = slide + 1
  }

  function prev() {
    previousSlide = slide
    slide = slide - 1
  }
</script>

<svelte:head>
  <title>{$translate('app.titles.scan')}</title>
</svelte:head>

{#if slide === 0}
  <Slide
    back={() => {
      goto('/')
    }}
    direction={previousSlide > slide ? 'right' : 'left'}
  >
    <Scanner onResult={handleScanResult} />
  </Slide>
{/if}

{#if slide === 1}
  <Slide back={prev} direction={previousSlide > slide ? 'right' : 'left'}>
    <Summary
      destination={$sendPayment$.bolt11}
      type="payment_request"
      {value}
      description={$sendPayment$.description}
      timestamp={$sendPayment$.timestamp}
      direction="send"
      expiry={$sendPayment$.expiry}
      on:complete={sendPayment}
      {requesting}
    />
  </Slide>
{/if}

<div class="absolute bottom-4">
  <ErrorMsg bind:message={errorMsg} />
</div>
