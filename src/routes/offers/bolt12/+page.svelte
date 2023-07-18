<script lang="ts">
  import Amount from '$lib/components/Amount.svelte'
  import TextScreen from '$lib/components/TextScreen.svelte'
  import Summary from '$lib/components/Summary.svelte'
  import { convertValue } from '$lib/conversion'
  import { goto } from '$app/navigation'
  import { BitcoinDenomination } from '$lib/types'
  import Slide from '$lib/elements/Slide.svelte'
  import ErrorMsg from '$lib/elements/ErrorMsg.svelte'
  import { translate } from '$lib/i18n/translations'
  import lightning from '$lib/lightning'
  import trendingUp from '$lib/icons/trending-up'
  import trendingDown from '$lib/icons/trending-down'
  import Quantity from '$lib/components/Quantity.svelte'
  import { nodeInfo$, offers$, settings$ } from '$lib/streams'

  let requesting = false
  let errorMsg = ''

  let offerType: 'pay' | 'withdraw'
  let value = ''
  let description = ''
  let expiry = 0
  let singleUse: boolean | undefined = undefined
  let issuer = ''
  let label = ''
  let quantityMax = 0
  let allowQuantity = false

  type Slides = typeof slides
  type SlideStep = Slides[number]
  type SlideDirection = 'right' | 'left'

  $: nodeVersion = extractVersion($nodeInfo$.data?.version)

  function extractVersion(inputString: string | undefined): number {
    if (!inputString) return 0
    const regex = /v(\d+\.\d+)/ // matches the 'v' character followed by one or more digits, a period, and one or more digits
    const match = inputString.match(regex) // extracts the matched substring
    const version = match && match[1].replace('.', '') // removes the period from the extracted version string
    return version ? parseInt(version) : 0
  }

  const slides = [
    'offer_type',
    'amount',
    'description',
    'issuer',
    'label',
    'quantity',
    'summary'
  ] as const

  let slide: SlideStep = 'offer_type'
  let previousSlide: SlideStep = 'offer_type'

  $: slideDirection = (
    slides.indexOf(previousSlide) > slides.indexOf(slide) ? 'right' : 'left'
  ) as SlideDirection

  function back() {
    previousSlide = slides[slides.indexOf(slide) - 2]
    slide = slides[slides.indexOf(slide) - 1]
  }

  function next(to = slides[slides.indexOf(slide) + 1]) {
    previousSlide = slide

    if (to === 'label' && offerType === 'withdraw' && nodeVersion < 2303) {
      // skip label for withdraw && version due to bug in CoreLN
      slide = slides[slides.indexOf(to) + 1]
    } else {
      slide = to
    }
  }

  async function submit() {
    errorMsg = ''
    requesting = true

    const lnApi = lightning.getLn()

    const formattedValue =
      !value || value === '0' || value === 'any'
        ? 'any'
        : convertValue({
            value,
            from: $settings$.primaryDenomination,
            to: BitcoinDenomination.msats
          })

    const formattedLabel = label || undefined
    const formattedIssuer = issuer || undefined
    const formattedExpiry = expiry ? Date.now() / 1000 + expiry : undefined

    let createdOfferId = ''

    try {
      // OFFER - PAY
      if (offerType === 'pay') {
        const { created, offer_id, ...offer } = await lnApi.createPayOffer({
          amount: formattedValue as string,
          description,
          absolute_expiry: formattedExpiry,
          single_use: singleUse,
          issuer: formattedIssuer,
          label: formattedLabel,
          quantity_max: allowQuantity ? quantityMax : undefined
        })

        if (created) {
          $offers$.data?.push({
            id: offer_id,
            type: 'pay',
            ...offer,
            offerType: 'bolt12 offer',
            denomination: BitcoinDenomination.msats,
            amount: formattedValue as string,
            description,
            nodeId: $nodeInfo$.data?.id as string
          })
        }

        createdOfferId = offer_id
      }
      // OFFER - WITHDRAW
      else {
        const { invreq_id, ...offer } = await lnApi.createWithdrawOffer({
          amount: formattedValue as string,
          description,
          absolute_expiry: formattedExpiry,
          single_use: singleUse,
          issuer: formattedIssuer,
          label: formattedLabel
        })

        $offers$.data?.push({
          id: invreq_id,
          type: 'withdraw',
          ...offer,
          offerType: 'bolt12 invoice_request',
          denomination: BitcoinDenomination.msats,
          amount: formattedValue as string,
          description,
          nodeId: $nodeInfo$.data?.id as string
        })
        createdOfferId = invreq_id
      }
    } catch (error) {
      const { code, message } = error as { code: number; message: string }
      errorMsg = $translate(`app.errors.${code}`, { default: message })
    } finally {
      requesting = false

      if (createdOfferId) {
        goto(`/offers/${createdOfferId}`)
      }
    }
  }
</script>

<svelte:head>
  <title>{$translate('app.titles./offer')}</title>
</svelte:head>

{#if slide === 'offer_type'}
  <Slide
    back={() => {
      goto('/offers')
    }}
    backText={$translate('app.titles./offers')}
    direction={slideDirection}
  >
    <section class="flex flex-col justify-center items-start w-full p-4 max-w-lg">
      <h1 class="text-4xl font-bold mb-4">{$translate('app.headings.offer_type')}</h1>
      <p class="text-neutral-600 dark:text-neutral-400 italic">
        {$translate('app.subheadings.offer_type')}
      </p>

      <div class="flex items-center mt-6 w-full gap-x-8">
        <button
          on:click={() => {
            offerType = 'pay'
            singleUse = false
            next()
          }}
          class:border-utility-success={offerType === 'pay'}
          class:bg-black={offerType === 'pay'}
          class:border-2={offerType === 'pay'}
          class="w-1/2 flex flex-col items-center justify-center border aspect-square text-lg font-bold shadow-sm dark:shadow-neutral-700 rounded-md dark:hover:bg-neutral-800/40 hover:bg-neutral-50/50 transition-all"
        >
          <div class="w-10 mb-2 text-utility-success">{@html trendingUp}</div>
          {$translate('app.labels.pay')}
        </button>
        <button
          on:click={() => {
            offerType = 'withdraw'
            next()
          }}
          class:border-purple-300={offerType === 'withdraw'}
          class:bg-black={offerType === 'withdraw'}
          class:border-2={offerType === 'withdraw'}
          class="w-1/2 flex flex-col items-center justify-center border aspect-square text-lg font-bold shadow-sm dark:shadow-neutral-700 rounded-md dark:hover:bg-neutral-800/40 hover:bg-neutral-50/50 transition-all"
        >
          <div class="w-10 mb-2 text-purple-300">{@html trendingDown}</div>
          {$translate('app.labels.withdraw')}
        </button>
      </div>
    </section>
  </Slide>
{/if}

{#if slide === 'amount'}
  <Slide {back} backText={$translate(`app.labels.${previousSlide}`)} direction={slideDirection}>
    <Amount
      bind:value
      required={offerType === 'withdraw'}
      {next}
      direction={offerType === 'withdraw' ? 'send' : 'receive'}
      type="bolt12"
      hint={offerType === 'pay' ? $translate('app.hints.any_amount') : ''}
    />
  </Slide>
{/if}

{#if slide === 'description'}
  <Slide {back} backText={$translate(`app.labels.${previousSlide}`)} direction={slideDirection}>
    <TextScreen
      bind:value={description}
      label="description"
      {next}
      hint={$translate('app.labels.optional')}
      context={{ paymentType: 'bolt12', direction: offerType === 'pay' ? 'receive' : 'send' }}
    />
  </Slide>
{/if}

{#if slide === 'issuer'}
  <Slide {back} backText={$translate(`app.labels.${previousSlide}`)} direction={slideDirection}>
    <TextScreen
      bind:value={issuer}
      label="issuer"
      {next}
      hint={$translate('app.labels.optional')}
    />
  </Slide>
{/if}

{#if slide === 'label'}
  <Slide {back} backText={$translate(`app.labels.${previousSlide}`)} direction={slideDirection}>
    <TextScreen
      bind:value={label}
      label="label"
      next={() => (offerType === 'withdraw' ? next('summary') : next())}
      hint={$translate('app.labels.optional')}
    />
  </Slide>
{/if}

{#if slide === 'quantity'}
  <Slide {back} backText={$translate(`app.labels.${previousSlide}`)} direction={slideDirection}>
    <Quantity
      bind:quantity={quantityMax}
      {next}
      hint={$translate('app.hints.any_quantity')}
      bind:allowQuantity
    />
  </Slide>
{/if}

{#if slide === 'summary'}
  <Slide {back} backText={$translate(`app.labels.${previousSlide}`)} direction={slideDirection}>
    <Summary
      paymentType="bolt12"
      paymentAction="create"
      {value}
      {description}
      {issuer}
      bind:expiry
      direction={offerType === 'pay' ? 'receive' : 'send'}
      {requesting}
      {quantityMax}
      {singleUse}
      on:complete={submit}
    />
  </Slide>
{/if}

<div class="absolute bottom-0 p-4">
  <ErrorMsg bind:message={errorMsg} />
</div>
