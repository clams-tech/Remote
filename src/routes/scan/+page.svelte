<script lang="ts">
  import Big from 'big.js'
  import { goto } from '$app/navigation'
  import Slide from '$lib/elements/Slide.svelte'
  import Scanner from '$lib/components/Scanner.svelte'
  import Summary from '$lib/components/Summary.svelte'
  import ErrorMsg from '$lib/elements/ErrorMsg.svelte'
  import {
    BitcoinDenomination,
    type ParsedBitcoinStringError,
    type ParsedOffChainString,
    type ParsedOnchainString,
    type Payment,
    type SendPayment
  } from '$lib/types'
  import { paymentUpdates$, settings$, SvelteSubject } from '$lib/streams'
  import { translate } from '$lib/i18n/translations'
  import type { ErrorResponse } from '$lib/backends'
  import { convertValue } from '$lib/conversion'
  import lightning from '$lib/lightning'
  import Amount from '$lib/components/Amount.svelte'
  import { createRandomHex, decodeBolt11, parseBitcoinUrl } from '$lib/utils'

  let requesting = false
  let errorMsg = ''

  const sendPayment$ = new SvelteSubject<SendPayment>({
    destination: '',
    type: null,
    description: '',
    expiry: null,
    timestamp: null,
    amount: '',
    value: ''
  })

  async function handleScanResult(scanResult: string) {
    const parsed = parseBitcoinUrl(scanResult)
    const { error } = parsed as ParsedBitcoinStringError

    if (error) {
      errorMsg = error
      return
    }

    const { type, value } = parsed as ParsedOffChainString | ParsedOnchainString

    // lnurl
    if (type === 'lnurl') {
      goto(`/lnurl?lnurl=${value}`)
      return
    }

    // Bolt 12 Offers
    if (type === 'bolt12') {
      goto(`/offers?bolt12=${value}`)
      return
    }

    // keysend
    if (type === 'keysend') {
      sendPayment$.next({
        type: 'keysend',
        destination: value as string,
        description: '',
        expiry: null,
        value: '',
        amount: '',
        timestamp: null
      })

      next()

      return
    }

    if (type === 'bolt11') {
      const decoded = await decodeBolt11(value as string)

      if (!decoded) {
        errorMsg = $translate('app.errors.invalid_bolt11')
        return
      }

      const { description, expiry, amount, timestamp } = decoded

      sendPayment$.next({
        type: 'bolt11',
        destination: value as string,
        description: description || '',
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

      return
    }

    if (type === 'onchain') {
      errorMsg = $translate('app.errors.onchain_unsupported')
    }
  }

  async function sendPayment() {
    const { destination, description, value, type } = sendPayment$.getValue()
    const { primaryDenomination } = $settings$

    errorMsg = ''
    requesting = true

    const id = createRandomHex()

    try {
      const lnApi = lightning.getLn()

      let payment: Payment | null = null

      if (type === 'keysend') {
        payment = await lnApi.payKeysend({
          id,
          destination,
          amount_msat: Big(
            convertValue({
              value,
              from: primaryDenomination,
              to: BitcoinDenomination.msats
            }) as string
          )
            .round()
            .toString()
        })
      }

      if (type === 'bolt11') {
        payment = await lnApi.payInvoice({
          bolt11: destination,
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
      }

      if (!payment) return

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
  <Slide back={() => to(previousSlide)} direction={previousSlide > slide ? 'right' : 'left'}>
    <Summary
      destination={$sendPayment$.destination}
      type="bolt11"
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
