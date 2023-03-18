<script lang="ts">
  import Spinner from '$lib/elements/Spinner.svelte'
  import { translate } from '$lib/i18n/translations'
  import warning from '$lib/icons/warning'
  import type { PageData } from './$types'
  import { goto } from '$app/navigation'
  import Slide from '$lib/elements/Slide.svelte'
  import BackButton from '$lib/elements/BackButton.svelte'
  import { offers$, offersPayments$, settings$ } from '$lib/streams'
  import type { FormattedDecodedOffer } from '$lib/types'
  import lightningOutline from '$lib/icons/lightning-outline'
  import { formatValueForDisplay } from '$lib/utils'
  import { fade } from 'svelte/transition'
  import { currencySymbols } from '$lib/constants'
  import { convertValue } from '$lib/conversion'
  import Qr from '$lib/components/QR.svelte'
  import ExpiryCountdown from '$lib/components/ExpiryCountdown.svelte'
  import SummaryRow from '$lib/elements/SummaryRow.svelte'
  import CopyValue from '$lib/elements/CopyValue.svelte'
  import PaymentsList from '$lib/elements/PaymentsList.svelte'
  import check from '$lib/icons/check'
  import trendingUp from '$lib/icons/trending-up'
  import trendingDown from '$lib/icons/trending-down'

  export let data: PageData

  let expired = false
  let decodedOffer: FormattedDecodedOffer

  $: offer = $offers$.data && $offers$.data.find(({ id }) => id === data.id)
  $: offerNotFound = !$offers$.loading && !!$offers$.data && !offer
  $: offerPayments = $offersPayments$[data.id] || []
  $: primarySymbol = currencySymbols[$settings$.primaryDenomination]
  $: secondarySymbol = currencySymbols[$settings$.secondaryDenomination]

  $: primaryValue = (offer &&
    convertValue({
      value: offer.amount,
      from: decodedOffer.denomination,
      to: $settings$.primaryDenomination
    })) as string

  $: secondaryValue = (decodedOffer &&
    convertValue({
      value: decodedOffer.amount,
      from: decodedOffer.denomination,
      to: $settings$.secondaryDenomination
    })) as string

  $: abs = decodedOffer?.offerType === 'bolt12 invoice_request' ? '-' : '+'

  let status: 'completed' | 'disabled' | 'active' | 'expired'

  $: if (offer) {
    const { active, single_use, used } = offer

    if (expired) {
      status === 'expired'
    } else if (!active) {
      if (single_use && used) {
        status = 'completed'
      } else {
        status = 'disabled'
      }
    } else {
      status = 'active'
    }
  }
</script>

<svelte:head>
  <title>
    {$translate('app.titles./offer')}
  </title>
</svelte:head>

{#if offerNotFound}
  <BackButton on:click={() => goto('/offers')} text={$translate('app.titles./offers')} />
  <section class="w-full p-4 max-w-lg flex items-center justify-center">
    <div class="flex items-center mb-6 mt-12">
      <div class="w-10 mr-2">{@html lightningOutline}</div>
      <h1 class="text-4xl font-bold">
        {$translate('app.titles./offers')}
      </h1>
    </div>
    <div class="flex text-utility-error">
      <div class="w-4 mr-2">{@html warning}</div>
      <p>
        {$translate('app.errors.offer_not_found')}
      </p>
    </div>
  </section>
{:else if !offer}
  <Spinner />
{:else}
  {@const {
    id,
    label,
    bolt12,
    single_use,
    description,
    nodeId,
    issuer,
    quantityMax,
    recurrence,
    offerExpiry
  } = offer}

  <Slide back={() => goto('/offers')} backText={$translate('app.titles./offers')} direction="left">
    <section class="flex flex-col justify-center items-start w-full p-4 max-w-lg">
      <div class="w-full h-12 bg-white dark:bg-neutral-900" />
      <div class="w-full flex flex-col max-h-screen overflow-auto">
        <!-- AMOUNT -->
        <div class="flex flex-col items-center justify-center">
          <span
            >{$translate(`app.labels.${status}`)}
            {$translate(`app.labels.offer`)}</span
          >
          <div in:fade class="flex flex-col items-end">
            <span class="text-4xl flex items-center tracking-wider"
              >{abs}<span
                class="flex justify-center items-center"
                class:w-9={primarySymbol.startsWith('<')}
                class:mr-[2px]={!primarySymbol.startsWith('<')}>{@html primarySymbol}</span
              >
              {#if primaryValue !== null}
                {primaryValue === '0'
                  ? $translate('app.labels.any')
                  : formatValueForDisplay({
                      value: primaryValue,
                      denomination: $settings$.primaryDenomination,
                      commas: true
                    })}
              {:else}
                <div class="ml-1">
                  <Spinner size="2rem" />
                </div>
              {/if}
            </span>
            <span class="text-neutral-600 dark:text-neutral-400 flex items-center"
              >{abs}<span
                class="flex justify-center items-center"
                class:w-4={secondarySymbol.startsWith('<')}
                class:mr-[2px]={!secondarySymbol.startsWith('<')}>{@html secondarySymbol}</span
              >
              {#if secondaryValue !== null}
                {secondaryValue === '0'
                  ? $translate('app.labels.any')
                  : formatValueForDisplay({
                      value: secondaryValue || '0',
                      denomination: $settings$.secondaryDenomination,
                      commas: true
                    })}
              {:else}
                <div class="ml-1">
                  <Spinner size="1rem" />
                </div>
              {/if}
            </span>
          </div>
        </div>

        <!-- QR AND EXPIRY COUNTDOWN -->
        {#if status === 'active'}
          <div class="my-4 flex flex-col items-center justify-center">
            <Qr value={bolt12} />
            {#if offerExpiry}
              <div class="mt-2">
                <ExpiryCountdown
                  on:expired={() => (expired = true)}
                  expiry={new Date(offerExpiry)}
                />
              </div>
            {/if}
          </div>
        {/if}

        <!--------------- DETAILS ----------------------->
        <div class="mt-8">
          <!-- STATUS -->
          <SummaryRow>
            <span slot="label">{$translate('app.labels.status')}:</span>
            <span
              class="flex items-center"
              class:text-utility-success={status === 'active' || status === 'completed'}
              class:text-utility-error={status === 'disabled' || status === 'expired'}
              slot="value"
            >
              {$translate(`app.labels.${status}`)}

              {#if status === 'active' || status === 'completed'}
                <div in:fade class="w-4 ml-1 border border-utility-success rounded-full">
                  {@html check}
                </div>
              {:else}
                <div in:fade class="w-4 ml-1">
                  {@html warning}
                </div>
              {/if}
            </span>
          </SummaryRow>

          <!-- BOLT12 -->
          {#if bolt12}
            <SummaryRow>
              <span slot="label">{$translate('app.labels.bolt12')}:</span>
              <div slot="value">
                <CopyValue value={bolt12} truncateLength={9} />
              </div>
            </SummaryRow>
          {/if}

          <!-- OFFER TYPE -->
          <SummaryRow>
            <span slot="label">{$translate('app.labels.offer_type')}:</span>
            <span class="flex items-center" slot="value">
              {$translate(`app.labels.${offer.type === 'pay' ? 'pay' : 'withdraw'}`)}

              <div
                class="w-6 ml-1"
                class:text-utility-success={offer.type === 'pay'}
                class:text-purple-400={offer.type === 'withdraw'}
              >
                {@html offer.type === 'pay' ? trendingUp : trendingDown}
              </div>
            </span>
          </SummaryRow>

          <!-- ISSUER -->
          {#if issuer}
            <SummaryRow>
              <span slot="label">{$translate('app.labels.issuer')}:</span>
              <div slot="value">
                <CopyValue value={issuer} />
              </div>
            </SummaryRow>
          {/if}

          <!-- DESCRIPTION -->
          {#if description}
            <SummaryRow>
              <span slot="label">{$translate('app.labels.description')}:</span>
              <span slot="value">{description}</span>
            </SummaryRow>
          {/if}

          <!-- SINGLE USE -->
          {#if single_use}
            <SummaryRow>
              <span slot="label">{$translate('app.labels.single_use')}:</span>
              <div
                slot="value"
                class="w-5 p-[1px] text-utility-success border border-current rounded-full"
              >
                {@html check}
              </div>
            </SummaryRow>
          {/if}

          <!-- LABEL -->
          {#if label}
            <SummaryRow>
              <span slot="label">{$translate('app.labels.label')}:</span>
              <span slot="value">{label}</span>
            </SummaryRow>
          {/if}

          <!-- OFFER HASH/ID -->
          <SummaryRow>
            <span slot="label">{$translate('app.labels.hash')}:</span>
            <div slot="value">
              <CopyValue value={id} truncateLength={9} />
            </div>
          </SummaryRow>

          <!-- PAYMENTS -->
          {#if offerPayments.length}
            <SummaryRow baseline>
              <span slot="label"
                >{$translate(
                  `app.labels.${offer.type === 'pay' ? 'payments' : 'withdrawals'}`
                )}:</span
              >
              <div class="w-full" slot="value">
                <PaymentsList payments={offerPayments} />
              </div>
            </SummaryRow>
          {/if}

          <!-- MAX QUANTITY -->
          {#if quantityMax}
            <SummaryRow>
              <span slot="label">{$translate('app.labels.max_quantity')}:</span>
              <div slot="value">
                {quantityMax}
              </div>
            </SummaryRow>
          {/if}
        </div>
      </div>
    </section>
  </Slide>
{/if}
