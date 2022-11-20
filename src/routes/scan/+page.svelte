<script lang="ts">
  import { decode } from 'light-bolt11-decoder'
  import Big from 'big.js'
  import { goto } from '$app/navigation'
  import Slide from '$lib/elements/Slide.svelte'
  import Scanner from '$lib/components/Scanner.svelte'
  import Summary from '$lib/components/Summary.svelte'
  import ErrorMsg from '$lib/elements/ErrorMsg.svelte'
  import { BitcoinDenomination, type Payment } from '$lib/types'
  import { paymentUpdates$, settings$, SvelteSubject } from '$lib/streams'
  import { translate } from '$lib/i18n/translations'
  import type { ErrorResponse } from '$lib/backends'
  import { createRandomHex, formatDecodedInvoice } from '$lib/utils'
  import { convertValue } from '$lib/conversion'
  import lightning from '$lib/lightning'
  import Amount from '$lib/components/Amount.svelte'

  let requesting = false
  let errorMsg = ''

  const sendPayment$ = new SvelteSubject<
    Pick<Payment, 'bolt11' | 'description' | 'value'> & {
      expiry: number | null
      timestamp: number | null
      amount: string
    }
  >({
    bolt11: '',
    description: '',
    expiry: null,
    value: '0',
    amount: '',
    timestamp: null
  })

  async function handleScanResult(scanResult: string) {
    let invoice: string

    // check if lnurl
    if (scanResult.toLowerCase().startsWith('lnurl')) {
      await goto(`/lnurl/${scanResult}`)
      return
    }

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
        value: '0',
        amount,
        timestamp
      })

      if (!amount || amount === '0') {
        next()
      } else {
        to(2)
      }
    } catch (error) {
      errorMsg = $translate('app.errors.invalid_invoice')
    }
  }

  async function sendPayment() {
    const { bolt11, description, value } = sendPayment$.getValue()
    const { primaryDenomination } = $settings$

    errorMsg = ''
    requesting = true

    const id = createRandomHex()

    try {
      const lnApi = lightning.getLn()
      const payment = await lnApi.payInvoice({
        bolt11: bolt11 as string,
        id,
        amount_msat:
          value && value !== '0'
            ? Big(
                convertValue({
                  value,
                  from: primaryDenomination,
                  to: BitcoinDenomination.msats
                }) as string
              )
                .round()
                .toString()
            : undefined
      })
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
    if (slide === 2) return
    previousSlide = slide
    slide = slide + 1
  }

  function prev() {
    previousSlide = slide
    slide = slide - 1
  }

  function to(i: number) {
    previousSlide = slide
    slide = i
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
    <Amount direction="send" bind:value={$sendPayment$.value} {next} required />
  </Slide>
{/if}

{#if slide === 2}
  <Slide back={prev} direction={previousSlide > slide ? 'right' : 'left'}>
    <Summary
      destination={$sendPayment$.bolt11}
      type="payment_request"
      value={$sendPayment$.value && $sendPayment$.value !== '0'
        ? $sendPayment$.value
        : convertValue({
            value: $sendPayment$.amount,
            from: BitcoinDenomination.msats,
            to: $settings$.primaryDenomination
          })}
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
