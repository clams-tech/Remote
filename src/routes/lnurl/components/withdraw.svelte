<script lang="ts">
  import { goto } from '$app/navigation'
  import Amount from '$lib/components/Amount.svelte'
  import Summary from '$lib/components/Summary.svelte'
  import { LNURL_PROXY } from '$lib/constants'
  import { convertValue } from '$lib/conversion'
  import Button from '$lib/elements/Button.svelte'
  import ErrorMsg from '$lib/elements/ErrorMsg.svelte'
  import Slide from '$lib/elements/Slide.svelte'
  import SummaryRow from '$lib/elements/SummaryRow.svelte'
  import { translate } from '$lib/i18n/translations'
  import arrow from '$lib/icons/arrow'
  import { listeningForAllInvoiceUpdates$, paymentUpdates$, settings$ } from '$lib/streams'
  import { BitcoinDenomination } from '$lib/types'
  import { createRandomHex, mainDomain } from '$lib/utils'
  import Big from 'big.js'
  import lightning from '$lib/lightning'

  export let url: URL
  export let k1: string
  export let callback: string // The URL from LN SERVICE which will accept the pay request parameters
  export let minWithdrawable: number // Min amount (in millisatoshis) the user can withdraw from LN SERVICE, or 0
  export let maxWithdrawable: number // Max amount (in millisatoshis) the user can withdraw from LN SERVICE, or equal to minWithdrawable if the user has no choice over the amounts
  export let defaultDescription: string // A default withdrawal invoice description

  const serviceName = mainDomain(url.hostname)
  const fixedAmountWithdrawable = minWithdrawable === maxWithdrawable

  type Slides = typeof slides
  type SlideStep = Slides[number]
  type SlideDirection = 'right' | 'left'

  const slides = ['withdraw_request', 'amount', 'description', 'summary', 'completed'] as const
  let slide: SlideStep = 'withdraw_request'
  let previousSlide: SlideStep = 'withdraw_request'

  $: slideDirection =
    slides.indexOf(previousSlide) > slides.indexOf(slide) ? 'right' : ('left' as SlideDirection)

  function back() {
    previousSlide = slides[slides.indexOf(slide) - 2]
    slide = slides[slides.indexOf(slide) - 1]
  }

  function next(to = slides[slides.indexOf(slide) + 1]) {
    previousSlide = slide
    slide = to
  }

  let amount = ''
  let amountError = ''

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

    if (valueSats.lt(minWithdrawable)) {
      amountError = $translate('app.errors.min_withdrawable')
    }

    if (valueSats.gt(maxWithdrawable)) {
      amountError = $translate('app.errors.max_withdrawable')
    }

    !amountError && next()
  }

  let requesting = false
  let requestError = ''

  async function initiateWithdraw() {
    try {
      const amountMsats = fixedAmountWithdrawable
        ? minWithdrawable.toString()
        : convertValue({
            value: amount,
            from: $settings$.primaryDenomination,
            to: BitcoinDenomination.msats
          })

      requestError = ''
      requesting = true

      // create payment request
      const lnApi = lightning.getLn()

      const payment = await lnApi.createInvoice({
        amount_msat: amountMsats === '0' ? 'any' : (amountMsats as string),
        description: defaultDescription || `${serviceName} LNURL Withdraw`,
        expiry: $settings$.invoiceExpiry,
        label: createRandomHex()
      })

      // add to payments
      paymentUpdates$.next(payment)

      // if not listening for payments, track specific invoice
      if (!$listeningForAllInvoiceUpdates$) {
        lightning.waitForAndUpdatePayment(payment)
      }

      const url = new URL(callback)
      const kind = url.searchParams.get('kind')

      if (kind) {
        url.searchParams.set('kind', 'withdrawRequest')
      }

      url.searchParams.set('k1', k1)
      url.searchParams.set('pr', payment.invoice as string)

      const result = await fetch(LNURL_PROXY, {
        headers: {
          'Target-URL': url.toString()
        }
      }).then((res) => res.json())

      if (result.status === 'ERROR') {
        throw new Error(result.reason)
      }

      goto(`/payments/${payment.id}`)
    } catch (error) {
      const { message } = error as Error
      requestError = message
      requesting = false
    }
  }
</script>

{#if slide === 'withdraw_request'}
  <Slide
    back={() => {
      goto('/')
    }}
    backText={$translate('app.titles./')}
    direction={slideDirection}
  >
    <section class="flex flex-col justify-center items-start w-full p-4 max-w-lg">
      <h1 class="text-4xl font-bold mb-4">{$translate('app.headings.withdraw_request')}</h1>
      <h2 class="text-2xl font-semibold mb-2">{serviceName}</h2>

      <p class="text-neutral-600 dark:text-neutral-400 italic">
        {defaultDescription}
      </p>

      <div class="mt-8 w-full">
        <SummaryRow>
          <span slot="label"
            >{$translate(
              fixedAmountWithdrawable
                ? 'app.labels.fixed_withdrawable'
                : 'app.labels.min_withdrawable'
            )}:</span
          >
          <span slot="value"
            >{convertValue({
              value: minWithdrawable.toString(),
              from: BitcoinDenomination.msats,
              to: $settings$.primaryDenomination
            })}
            {$settings$.primaryDenomination}</span
          >
        </SummaryRow>

        {#if !fixedAmountWithdrawable}
          <SummaryRow>
            <span slot="label">{$translate('app.labels.max_withdrawable')}:</span>
            <span slot="value"
              >{convertValue({
                value: maxWithdrawable.toString(),
                from: BitcoinDenomination.msats,
                to: $settings$.primaryDenomination
              })}
              {$settings$.primaryDenomination}</span
            >
          </SummaryRow>
        {/if}
      </div>

      <div class="mt-6 w-full">
        <Button
          text={$translate('app.buttons.next')}
          on:click={() => next(fixedAmountWithdrawable ? 'description' : 'amount')}
        >
          <div slot="iconRight" class="w-6 -rotate-90">
            {@html arrow}
          </div>
        </Button>
      </div>
    </section>
  </Slide>
{/if}

{#if slide === 'amount'}
  <Slide {back} direction={slideDirection} backText={$translate(`app.labels.${previousSlide}`)}>
    <Amount
      direction="send"
      bind:value={amount}
      bind:error={amountError}
      next={validateAmount}
      hint={$translate('app.hints.pay_request', {
        min: `${convertValue({
          value: minWithdrawable.toString(),
          from: BitcoinDenomination.msats,
          to: $settings$.primaryDenomination
        })} ${$settings$.primaryDenomination.toUpperCase()}`,
        max: `${convertValue({
          value: maxWithdrawable.toString(),
          from: BitcoinDenomination.msats,
          to: $settings$.primaryDenomination
        })} ${$settings$.primaryDenomination.toUpperCase()}`
      })}
      minMsats={minWithdrawable.toString()}
      maxMsats={maxWithdrawable.toString()}
      required
    />
  </Slide>
{/if}

{#if slide === 'summary'}
  <Slide {back} direction={slideDirection} backText={$translate(`app.labels.${previousSlide}`)}>
    <Summary
      type="bolt11"
      direction="receive"
      destination={serviceName}
      description={defaultDescription}
      value={fixedAmountWithdrawable
        ? convertValue({
            value: minWithdrawable.toString(),
            from: BitcoinDenomination.msats,
            to: $settings$.primaryDenomination
          })
        : amount}
      {requesting}
      expiry={null}
      on:complete={initiateWithdraw}
    />
  </Slide>
{/if}

<div class="absolute bottom-0 p-4">
  <ErrorMsg bind:message={requestError} />
</div>
