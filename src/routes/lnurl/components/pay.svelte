<script lang="ts">
  import { goto } from '$app/navigation'
  import Amount from '$lib/components/Amount.svelte'
  import Description from '$lib/components/Description.svelte'
  import Summary from '$lib/components/Summary.svelte'
  import { convertValue } from '$lib/conversion'
  import Button from '$lib/elements/Button.svelte'
  import Slide from '$lib/elements/Slide.svelte'
  import SummaryRow from '$lib/elements/SummaryRow.svelte'
  import { translate } from '$lib/i18n/translations'
  import arrow from '$lib/icons/arrow'
  import { settings$ } from '$lib/streams'
  import { BitcoinDenomination } from '$lib/types'
  import { mainDomain } from '$lib/utils'
  import Big from 'big.js'

  export let url: URL
  export let callback: string // The URL from LN SERVICE which will accept the pay request parameters
  export let maxSendable: number // Max millisatoshi amount LN SERVICE is willing to receive
  export let minSendable: number // Min millisatoshi amount LN SERVICE is willing to receive, can not be less than 1 or more than `maxSendable`
  export let metadata: string // Metadata json which must be presented as raw string here, this is required to pass signature verification at a later step
  export let commentAllowed: number // indicates the length of comment (description) allowed

  const serviceName = mainDomain(url.hostname)

  let meta: string[][]
  let shortDescription: string
  let longDescription: string | undefined
  let image: string | undefined

  let slide = 0
  let previousSlide = 0

  let amount = ''
  let amountError = ''

  let description = ''

  type FormattedMetadata = {
    shortDescription: string
    longDescription?: string
    image?: string
  }

  function formatMetadata(meta: string[][]) {
    return meta.reduce((acc, [mime, data], index) => {
      if (index === 0) {
        acc.shortDescription = data
      }

      if (mime.includes('long-desc')) {
        acc.longDescription = data
      }

      if (mime.includes('image')) {
        acc.image = data
      }

      return acc
    }, {} as FormattedMetadata)
  }

  try {
    meta = JSON.parse(metadata)
    const formattedMetadata = formatMetadata(meta)
    console.log(formattedMetadata)
    shortDescription = formattedMetadata.shortDescription
    longDescription = formattedMetadata.longDescription
    image = formattedMetadata.image

    if (!meta) {
      next()
    }
  } catch (error) {
    // just don't show invalid metadata
    next()
  }

  function back() {
    slide -= 1
  }

  function next(increment = 1) {
    slide += increment
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

    !amountError && next(commentAllowed ? 1 : 2)
  }

  let requesting = false

  function initiatePay() {
    requesting = true
    // make a get request to `${callback}?amount=${amountMsat}&comment={description}`
    // from the return payload, take the `pr` value to get the payment request and also check for `successAction`
    // decode the payment request
    // verify the `h` tag is equal to the hash of `metadata` converted to a byte array in utf-8 encoding
    // verify the amount of the invoice equals the amount specified by user
    // if all good go ahead and pay invoice
    // if invoice paid, display successAction fields if exists (message, description, url)
    // the tag on the success action is either "message" or "url" or "aes"
    // "For message, a toaster or popup is sufficient. For url, the wallet should give the user a popup which displays description, url, and a 'open' button to open the url in a new browser tab."
    // if aes tag, then get preimage from paid invoice to use to decrypt cipher text (from successAction field: `ciphertext`, `iv`)
    // if not then display an error
    requesting = false
  }

  function decryptCipherText(preimage: string, iv: string, cipherText: string) {
    // import aesjs from 'aes-js'
    // import Base64 from 'base64-js'
    // let key = aesjs.utils.hex.toBytes(preimage)
    // let iv = Base64.toByteArray(iv)
    // let ciphertext = Base64.toByteArray(ciphertext)
    // let CBC = new aesjs.ModeOfOperation.cbc(key, iv)
    // var plaintextBytes = CBC.decrypt(ciphertext)
    // // remove padding
    // let size = plaintext.length
    // let pad = plaintext[size - 1]
    // plaintextBytes = plaintext.slice(0, size - pad)
    // let plaintext = aesjs.utils.utf8.fromBytes(plaintextBytes)
  }
</script>

{#if slide === 0}
  <Slide
    back={() => {
      goto('/')
    }}
    direction={previousSlide > slide ? 'right' : 'left'}
  >
    <section class="flex flex-col justify-center items-start w-full p-6 max-w-lg">
      <h1 class="text-4xl font-bold mb-4">{$translate('app.headings.pay_request')}</h1>
      <h2 class="text-2xl font-semibold mb-2">{serviceName}</h2>

      <p class="text-neutral-600 dark:text-neutral-400 italic">
        {shortDescription}
      </p>

      {#if longDescription}
        <p class="text-neutral-600 dark:text-neutral-400 italic mt-2">
          {longDescription}
        </p>
      {/if}

      {#if image}
        <img class="mt-2" src={image} alt={$translate('app.headings.pay_request')} />
      {/if}

      <div class="mt-8 w-full">
        <SummaryRow>
          <span slot="label">{$translate('app.labels.min_sendable')}</span>
          <span slot="value"
            >{convertValue({
              value: minSendable.toString(),
              from: BitcoinDenomination.msats,
              to: $settings$.primaryDenomination
            })}
            {$settings$.primaryDenomination}</span
          >
        </SummaryRow>

        <SummaryRow>
          <span slot="label">{$translate('app.labels.max_sendable')}</span>
          <span slot="value"
            >{convertValue({
              value: maxSendable.toString(),
              from: BitcoinDenomination.msats,
              to: $settings$.primaryDenomination
            })}
            {$settings$.primaryDenomination}</span
          >
        </SummaryRow>
      </div>

      <div class="mt-6 w-full">
        <Button text={$translate('app.buttons.next')} on:click={() => next()}>
          <div slot="iconRight" class="w-6 -rotate-90">
            {@html arrow}
          </div>
        </Button>
      </div>
    </section>
  </Slide>
{/if}

{#if slide === 1}
  <Slide {back} direction={previousSlide > slide ? 'right' : 'left'}>
    <Amount
      direction="send"
      bind:value={amount}
      bind:error={amountError}
      next={validateAmount}
      hint={$translate('app.hints.pay_request', {
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
      minMsats={minSendable.toString()}
      maxMsats={maxSendable.toString()}
      required
    />
  </Slide>
{/if}

{#if slide === 2}
  <Slide {back} direction={previousSlide > slide ? 'right' : 'left'}>
    <Description {next} bind:description max={commentAllowed} />
  </Slide>
{/if}

{#if slide === 3}
  <Slide {back} direction={previousSlide > slide ? 'right' : 'left'}>
    <Summary
      type="payment_request"
      direction="send"
      destination={serviceName}
      {description}
      value={amount}
      requesting
      expiry={null}
    />
  </Slide>
{/if}
