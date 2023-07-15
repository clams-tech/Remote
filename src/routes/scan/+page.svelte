<script lang="ts">
  import Big from 'big.js'
  import { goto } from '$app/navigation'
  import Slide from '$lib/elements/Slide.svelte'
  import Scanner from '$lib/components/Scanner.svelte'
  import Summary from '$lib/components/Summary.svelte'
  import ErrorMsg from '$lib/elements/ErrorMsg.svelte'
  import { paymentUpdates$, settings$ } from '$lib/streams'
  import { translate } from '$lib/i18n/translations'
  import type { ErrorResponse } from '$lib/backends'
  import { convertValue } from '$lib/conversion'
  import lightning from '$lib/lightning'
  import Amount from '$lib/components/Amount.svelte'
  import {
    createRandomHex,
    decodeBolt11,
    parseBitcoinUrl,
    parseNodeAddress,
    validateParsedNodeAddress
  } from '$lib/utils'

  import {
    BitcoinDenomination,
    type ParsedBitcoinStringError,
    type ParsedOffChainString,
    type ParsedOnchainString,
    type Payment
  } from '$lib/types'

  let requesting = false
  let errorMsg = ''

  let destination = ''
  let type = ''
  let description = ''
  let expiry: number | null = null
  let timestamp: number | null = null
  let amount = ''
  let value = ''

  async function handleScanResult(scanResult: string) {
    // node address to open channel to
    try {
      if (validateParsedNodeAddress(parseNodeAddress(scanResult))) {
        await goto(`/channels/open?address=${scanResult}`)
        return
      }
    } catch (error) {
      // not a node address, so continue
    }

    const parsed = parseBitcoinUrl(scanResult)
    const { error } = parsed as ParsedBitcoinStringError

    if (error) {
      errorMsg = error
      return
    }

    const { type: parsedType, value: parsedValue } = parsed as
      | ParsedOffChainString
      | ParsedOnchainString

    type = parsedType
    destination = parsedValue as string

    // lnurl
    if (type === 'lnurl') {
      await goto(`/lnurl?lnurl=${parsedValue}`)
      return
    }

    // Bolt 12 Offers
    if (type === 'bolt12') {
      await goto(`/offers/bolt12/${parsedValue}`)
      return
    }

    // keysend
    if (type === 'keysend') {
      next()
      return
    }

    if (type === 'bolt11') {
      const decoded = decodeBolt11(destination)

      if (!decoded) {
        errorMsg = $translate('app.errors.invalid_bolt11')
        return
      }

      description = decoded.description || ''
      value = '0'
      expiry = decoded.expiry || 3600
      amount = decoded.amount
      timestamp = decoded.timestamp

      next(!amount || amount === '0' ? 'amount' : 'summary')

      return
    }

    if (type === 'onchain') {
      errorMsg = $translate('app.errors.onchain_unsupported')
    }
  }

  async function sendPayment() {
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
          invoice: destination,
          type: 'bolt11',
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

  type Slides = typeof slides
  type SlideStep = Slides[number]
  type SlideDirection = 'right' | 'left'

  const slides = ['scan', 'amount', 'summary'] as const
  let slide: SlideStep = 'scan'
  let previousSlide: SlideStep = 'scan'

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
</script>

<svelte:head>
  <title>{$translate('app.titles./scan')}</title>
</svelte:head>

{#if slide === 'scan'}
  <Slide
    back={() => {
      goto('/')
    }}
    backText={$translate('app.titles./')}
    direction={slideDirection}
  >
    <Scanner on:result={(res) => handleScanResult(res.detail)} />
  </Slide>
{/if}

{#if slide === 'amount'}
  <Slide {back} direction={slideDirection} backText={$translate(`app.labels.${previousSlide}`)}>
    <Amount direction="send" bind:value {next} required />
  </Slide>
{/if}

{#if slide === 'summary'}
  <Slide
    back={() => next(previousSlide)}
    direction={slideDirection}
    backText={$translate(`app.labels.${previousSlide}`)}
  >
    <Summary
      {destination}
      paymentType="bolt11"
      paymentAction="create"
      value={value && value !== '0'
        ? value
        : convertValue({
            value: amount,
            from: BitcoinDenomination.msats,
            to: $settings$.primaryDenomination
          })}
      {description}
      {timestamp}
      direction="send"
      expiry={expiry || 600}
      on:complete={sendPayment}
      {requesting}
    />
  </Slide>
{/if}

<div class="absolute bottom-4">
  <ErrorMsg bind:message={errorMsg} />
</div>
