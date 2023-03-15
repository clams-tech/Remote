<script lang="ts">
  import Big from 'big.js'
  import { goto } from '$app/navigation'
  import Destination from '$lib/components/Destination.svelte'
  import Summary from '$lib/components/Summary.svelte'
  import Slide from '$lib/elements/Slide.svelte'
  import { convertValue } from '$lib/conversion'
  import { paymentUpdates$, settings$ } from '$lib/streams'
  import Amount from '$lib/components/Amount.svelte'
  import TextScreen from '$lib/components/TextScreen.svelte'
  import ErrorMsg from '$lib/elements/ErrorMsg.svelte'
  import { translate } from '$lib/i18n/translations'
  import lightning from '$lib/lightning'
  import { createRandomHex, parseBitcoinUrl } from '$lib/utils'
  import type { PageData } from './$types'

  import {
    BitcoinDenomination,
    type ParsedBitcoinStringError,
    type ParsedOffChainString,
    type ParsedOnchainString,
    type Payment
  } from '$lib/types'

  export let data: PageData

  let requesting = false
  let errorMsg = ''

  type Slides = typeof slides
  type SlideStep = Slides[number]
  type SlideDirection = 'right' | 'left'

  const slides = ['destination', 'amount', 'description', 'summary'] as const
  let slide: SlideStep = 'destination'
  let previousSlide: SlideStep = 'destination'

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

  let destination = data.destination || ''
  let type = data.type || null
  let description = ''
  let expiry: number | null = null
  let timestamp: number | null = null
  let amount = ''
  let value = ''

  async function sendPayment() {
    requesting = true

    const { primaryDenomination } = $settings$

    let payment: Payment | null = null

    try {
      const lnApi = lightning.getLn()
      const id = createRandomHex()

      switch (type) {
        case 'bolt11': {
          payment = await lnApi.payInvoice({
            id,
            invoice: destination,
            type: 'bolt11',
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

          break
        }
        case 'keysend': {
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

          break
        }
      }

      if (payment) {
        paymentUpdates$.next({ ...payment, description })

        // delay to allow time for node to update
        setTimeout(() => lightning.updateFunds(), 1000)
        goto(`/payments/${payment.id}`)
      }
    } catch (error) {
      requesting = false

      const { code, message } = error as { code: number; message: string }

      errorMsg = code === -32602 ? message : $translate(`app.errors.${code}`, { default: message })
    }
  }

  function destinationNext() {
    const parsed = parseBitcoinUrl(destination)
    const { error } = parsed as ParsedBitcoinStringError

    if (error) {
      errorMsg = error
      return
    }

    const { type: parsedType, value } = parsed as ParsedOffChainString | ParsedOnchainString

    type = parsedType

    if (type === 'lnurl') {
      goto(`/lnurl?lnurl=${value}`)
      return
    }

    if (type === 'bolt12') {
      goto(`/offers/bolt12/${value}`)
      return
    }

    if (type === 'bolt11') {
      destination = value as string

      if (amount && amount !== '0') {
        next('summary')
        return
      }
    }

    // onchain not currently supported
    if (type === 'onchain') {
      errorMsg = $translate('app.errors.onchain_unsupported')
      return
    }

    next()
  }
</script>

<svelte:head>
  <title>{$translate('app.titles./send')}</title>
</svelte:head>

{#if slide === 'destination'}
  <Slide
    back={() => {
      goto('/')
    }}
    backText={$translate('app.titles./')}
    direction={slideDirection}
  >
    <Destination
      next={destinationNext}
      bind:destination
      bind:type
      bind:description
      bind:expiry
      bind:timestamp
      bind:amount
      on:clipboardError={({ detail }) => (errorMsg = detail)}
    />
  </Slide>
{/if}

{#if slide === 'amount'}
  <Slide {back} direction={slideDirection} backText={$translate(`app.labels.${previousSlide}`)}>
    <Amount
      direction="send"
      bind:value
      next={() => next(description ? 'summary' : 'description')}
      required
    />
  </Slide>
{/if}

{#if slide === 'description'}
  <Slide {back} direction={slideDirection} backText={$translate(`app.labels.${previousSlide}`)}>
    <TextScreen
      {next}
      bind:value={description}
      label="description"
      hint={$translate('app.labels.optional')}
    />
  </Slide>
{/if}

{#if slide === 'summary'}
  <Slide {back} direction={slideDirection} backText={$translate(`app.labels.${previousSlide}`)}>
    <Summary
      direction="send"
      {type}
      {destination}
      {description}
      expiry={expiry || 600}
      {timestamp}
      value={value && value !== '0'
        ? value
        : convertValue({
            value: amount,
            from: BitcoinDenomination.msats,
            to: $settings$.primaryDenomination
          })}
      {requesting}
      on:complete={sendPayment}
    />
  </Slide>
{/if}

<div class="absolute bottom-4">
  <ErrorMsg bind:message={errorMsg} />
</div>
