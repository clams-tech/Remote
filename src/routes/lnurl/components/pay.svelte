<script lang="ts">
  import { goto } from '$app/navigation'
  import { decode } from 'light-bolt11-decoder'
  import Amount from '$lib/components/Amount.svelte'
  import Description from '$lib/components/Description.svelte'
  import Summary from '$lib/components/Summary.svelte'
  import { LNURL_PROXY } from '$lib/constants'
  import { convertValue } from '$lib/conversion'
  import Button from '$lib/elements/Button.svelte'
  import ErrorMsg from '$lib/elements/ErrorMsg.svelte'
  import Slide from '$lib/elements/Slide.svelte'
  import SummaryRow from '$lib/elements/SummaryRow.svelte'
  import { translate } from '$lib/i18n/translations'
  import arrow from '$lib/icons/arrow'
  import { paymentUpdates$, settings$ } from '$lib/streams'
  import { BitcoinDenomination, type FormattedSections, type Payment } from '$lib/types'
  import { createRandomHex, formatDecodedInvoice, mainDomain, sha256 } from '$lib/utils'
  import Big from 'big.js'
  import lightning from '$lib/lightning'
  import check from '$lib/icons/check'
  import link from '$lib/icons/link'
  import CopyValue from '$lib/elements/CopyValue.svelte'
  import CryptoJS from 'crypto-js'

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
  let mime: string | undefined

  let slide = 0
  let previousSlide = 0

  let amount = ''
  let amountError = ''

  let description = ''

  type FormattedMetadata = {
    shortDescription: string
    longDescription?: string
    image?: string
    mime?: string
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
        acc.mime = mime
      }

      return acc
    }, {} as FormattedMetadata)
  }

  try {
    meta = JSON.parse(metadata)
    const formattedMetadata = formatMetadata(meta)

    shortDescription = formattedMetadata.shortDescription
    longDescription = formattedMetadata.longDescription
    image = formattedMetadata.image
    mime = formattedMetadata.mime

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
  let requestError = ''

  type SuccessMessage = { tag: 'message'; message: string }
  type SuccessUrl = { tag: 'url'; description: string; url: string }
  type SuccessAES = { tag: 'aes'; description: string; ciphertext: string; iv: string }
  type SuccessAction = SuccessMessage | SuccessUrl | SuccessAES

  let decodedPaymentRequest: FormattedSections & { paymentRequest: string }
  let completedPayment: Payment
  let success: SuccessAction
  let decryptedAes: string

  async function initiatePay() {
    try {
      const amountMsats = convertValue({
        value: amount,
        from: $settings$.primaryDenomination,
        to: BitcoinDenomination.msats
      })

      requestError = ''
      requesting = true

      const url = new URL(callback)
      const kind = url.searchParams.get('kind')

      if (kind) {
        url.searchParams.set('kind', 'payRequest')
      }

      url.searchParams.set('amount', amountMsats as string)

      if (description) {
        url.searchParams.set('comment', description)
      }

      const result = await fetch(LNURL_PROXY, {
        headers: {
          'Target-URL': url.toString()
        }
      }).then((res) => res.json())

      if (result.status === 'ERROR') {
        throw new Error(result.reason)
      }

      const { pr: paymentRequest, successAction } = result

      success = successAction
      decodedPaymentRequest = formatDecodedInvoice(decode(paymentRequest))

      const { description_hash, amount: paymentRequestAmount } = decodedPaymentRequest

      const hashedMetadata = sha256(metadata)

      if (hashedMetadata !== description_hash?.toString('hex')) {
        throw new Error($translate('app.errors.lnurl_metadata_hash'))
      }

      if (paymentRequestAmount !== amountMsats) {
        throw new Error($translate('app.errors.lnurl_pay_amount'))
      }

      const lnApi = lightning.getLn()

      const id = createRandomHex()

      completedPayment = await lnApi.payInvoice({
        id,
        bolt11: paymentRequest
      })

      paymentUpdates$.next({ ...completedPayment, description })

      // delay to allow time for node to update
      setTimeout(() => lightning.updateFunds(lnApi), 1000)

      if (!successAction) {
        goto(`/payments/${completedPayment.id}`)
        return
      }

      if (successAction.tag === 'aes') {
        decryptedAes = CryptoJS.AES.decrypt(
          successAction.ciphertext,
          CryptoJS.enc.Hex.parse(completedPayment.preimage!),
          { iv: CryptoJS.enc.Base64.parse(successAction.iv) }
        ).toString(CryptoJS.enc.Utf8)
      }

      next()
    } catch (error) {
      const { message } = error as Error
      requestError = message
    } finally {
      requesting = false
    }
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

      {#if image && mime}
        <img
          class="mt-2 max-w-xs"
          src={`data:${mime}, ${image}`}
          alt={$translate('app.headings.pay_request')}
        />
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
    <Description next={() => next()} bind:description max={commentAllowed} />
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
      {requesting}
      expiry={null}
      on:complete={initiatePay}
    />
  </Slide>
{/if}

{#if slide === 4}
  <Slide direction={previousSlide > slide ? 'right' : 'left'}>
    {@const { tag } = success}
    <section class="flex flex-col justify-center items-start w-full p-6 max-w-lg">
      <div class="flex items-center mb-4">
        <h1 class="text-4xl font-bold">{serviceName}</h1>
        <div class="w-8 border-2 border-utility-success rounded-full text-utility-success ml-2">
          {@html check}
        </div>
      </div>

      <p class="mb-4">
        {#if tag === 'message'}
          {success.message}
        {:else}
          {success.description}
        {/if}
      </p>

      {#if tag === 'url'}
        <div class="flex items-center justify-center mb-6">
          <p class="text-neutral-600 dark:text-neutral-400 italic">
            {success.url}
          </p>

          <a href={success.url} target="_blank" rel="noopener noreferrer" class="ml-2">
            <Button small text={$translate('app.buttons.open')}>
              <div class="w-5 mr-1" slot="iconLeft">{@html link}</div>
            </Button>
          </a>
        </div>
      {/if}

      {#if tag === 'aes'}
        <div class="mb-6 w-full">
          <CopyValue value={decryptedAes} />
        </div>
      {/if}

      <Button
        primary
        on:click={() => goto(`/payments/${completedPayment.id}`)}
        text={$translate('app.buttons.go_to_payment')}
      />
    </section>
  </Slide>
{/if}

<div class="absolute bottom-0 p-4">
  <ErrorMsg bind:message={requestError} />
</div>
