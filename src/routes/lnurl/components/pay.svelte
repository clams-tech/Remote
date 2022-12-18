<script lang="ts">
  import { goto } from '$app/navigation'
  import Amount from '$lib/components/Amount.svelte'
  import Description from '$lib/components/Description.svelte'
  import { convertValue } from '$lib/conversion'
  import Slide from '$lib/elements/Slide.svelte'
  import { translate } from '$lib/i18n/translations'
  import { settings$ } from '$lib/streams'
  import { BitcoinDenomination } from '$lib/types'
  import Big from 'big.js'

  export let callback: string // The URL from LN SERVICE which will accept the pay request parameters
  export let maxSendable: number // Max millisatoshi amount LN SERVICE is willing to receive
  export let minSendable: number // Min millisatoshi amount LN SERVICE is willing to receive, can not be less than 1 or more than `maxSendable`
  export let metadata: string // Metadata json which must be presented as raw string here, this is required to pass signature verification at a later step

  let meta
  let shortDescription: string[]
  let longDescription: string[]
  let image: string[]

  let slide = 0
  let previousSlide = 0

  let amount = ''
  let amountError = ''

  let description = ''

  try {
    meta = JSON.parse(metadata)
    shortDescription = meta[0]
    longDescription = meta[1]
    image = meta[2]
  } catch (error) {
    // just don't show invalid metadata
  }

  if (!meta) {
    next()
  }

  function next() {
    slide += 1
  }

  function validateAmount() {
    const valueSats =
      amount && amount !== '0'
        ? Big(
            convertValue({
              value: amount,
              from: $settings$.primaryDenomination,
              to: BitcoinDenomination.msats
            }) as string
          )
        : Big(0)

    if (valueSats.lt(minSendable)) {
      amountError = $translate('app.errors.min_sendable')
    }

    if (valueSats.gt(maxSendable)) {
      amountError = $translate('app.errors.max_sendable')
    }

    !amountError && next()
  }
</script>

{#if slide === 0}
  meta
{/if}

{#if slide === 1}
  <Slide
    back={() => {
      goto('/')
    }}
    direction={previousSlide > slide ? 'right' : 'left'}
  >
    <Amount
      direction="send"
      bind:value={amount}
      bind:error={amountError}
      next={validateAmount}
      description={$translate('app.hints.pay_request', {
        min: `${convertValue({
          value: minSendable.toString(),
          from: BitcoinDenomination.msats,
          to: $settings$.primaryDenomination
        })} ${$settings$.primaryDenomination.toUpperCase()}`,
        max: `${convertValue({
          value: maxSendable.toString(),
          from: BitcoinDenomination.msats,
          to: $settings$.primaryDenomination
        })} ${$settings$.primaryDenomination.toUpperCase()}`
      })}
      required
    />
  </Slide>
{/if}

{#if slide === 2}
  <Slide
    back={() => {
      goto('/')
    }}
    direction={previousSlide > slide ? 'right' : 'left'}
  >
    <Description {next} bind:description />
  </Slide>
{/if}
