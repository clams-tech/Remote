<script lang="ts">
  import Spinner from '$lib/components/Spinner.svelte'
  import { translate } from '$lib/i18n/translations'
  import warning from '$lib/icons/warning'
  import type { PageData } from './$types'
  import { goto } from '$app/navigation'
  import { connections$, settings$ } from '$lib/streams'
  import lightningOutline from '$lib/icons/lightning-outline'
  import { fade } from 'svelte/transition'
  import ExpiryCountdown from '$lib/components/ExpiryCountdown.svelte'
  import check from '$lib/icons/check'
  import trendingUp from '$lib/icons/trending-up'
  import trendingDown from '$lib/icons/trending-down'
  import { db } from '$lib/db.js'
  import { liveQuery } from 'dexie'
  import { from, map, mergeMap, of, timer } from 'rxjs'
  import { nowSeconds, truncateValue } from '$lib/utils.js'
  import type { AppError } from '$lib/@types/errors.js'
  import Modal from '$lib/components/Modal.svelte'
  import Button from '$lib/components/Button.svelte'
  import Msg from '$lib/components/Msg.svelte'
  import Section from '$lib/components/Section.svelte'
  import SectionHeading from '$lib/components/SectionHeading.svelte'
  import Summary from '../../transactions/Summary.svelte'
  import SummaryRow from '$lib/components/SummaryRow.svelte'
  import BitcoinAmount from '$lib/components/BitcoinAmount.svelte'
  import caret from '$lib/icons/caret.js'

  export let data: PageData

  let offerNotFound: boolean

  const offer$ = liveQuery(() =>
    db.offers.get(data.id).then((offer) => {
      offerNotFound = !offer

      if (offer) {
      }
      return offer
    })
  )

  const offerPayments$ = liveQuery(() => db.invoices.where({ 'offer.id': data.id }).toArray())

  const offerWallet$ = from(offer$).pipe(
    mergeMap((offer) => (offer ? db.wallets.get(offer.walletId) : of(null)))
  )

  const now$ = timer(0, 1000).pipe(map(nowSeconds))

  $: status =
    $offer$?.expiry && $offer$?.expiry < $now$
      ? 'expired'
      : $offer$?.active
      ? 'active'
      : $offer$?.singleUse && $offerPayments$?.length
      ? 'complete'
      : 'disabled'

  let showDisableModal = false
  let disablingOffer = false
  let disableOfferError = ''

  function toggleDisableModal() {
    showDisableModal = !showDisableModal
  }

  async function disableOffer() {
    disablingOffer = true
    disableOfferError = ''

    const connection = $connections$.find(({ walletId }) => walletId === $offer$?.walletId)

    if (!connection) {
      disableOfferError = $translate('app.errors.connection_not_available', {
        wallet: $offerWallet$?.label || $translate('app.labels.your_wallet')
      })
      return
    }

    try {
      if ($offer$?.type === 'pay') {
        await connection.offers?.disablePay!(data.id)
      }

      if ($offer$?.type === 'withdraw') {
        await connection.offers?.disableWithdraw!(data.id)
      }

      await db.offers.update!($offer$?.id!, { active: false })

      toggleDisableModal()
    } catch (error) {
      const { key } = error as AppError
      disableOfferError = $translate(`app.errors.${key}`)
    } finally {
      disablingOffer = false
    }
  }
</script>

<svelte:head>
  <title>
    {$translate('app.routes./offer.title')}
  </title>
</svelte:head>

<Section>
  <SectionHeading icon={lightningOutline} text={$translate('app.routes./offer.title')} />

  {#if offerNotFound}
    <div class="w-full mt-4">
      <Msg message={$translate('app.errors.could_not_find_offer')} type="error" />
    </div>
  {:else if !$offer$}
    <div class="mt-4">
      <Spinner />
    </div>
  {:else}
    {@const {
      label,
      amount,
      issuer,
      walletId,
      type,
      description,
      expiry,
      bolt12,
      used,
      singleUse,
      denomination
    } = $offer$}
    <div class="w-full">
      {#if label}
        <SummaryRow>
          <div slot="label">{$translate('app.labels.label')}:</div>
          <div slot="value">{label}</div>
        </SummaryRow>
      {/if}

      <SummaryRow>
        <div slot="label">{$translate('app.labels.amount')}:</div>
        <div slot="value">
          {#if amount}
            <BitcoinAmount sats={amount} />
          {:else}
            {$translate('app.labels.any')}
          {/if}
        </div>
      </SummaryRow>

      <SummaryRow>
        <div slot="label">{$translate('app.labels.wallet')}:</div>
        <a slot="value" href={`/wallets/${walletId}`} class="flex items-center no-underline">
          {#await db.wallets.get(walletId) then wallet}
            {wallet?.label || truncateValue(walletId)}
          {/await}

          <div class="w-4 -rotate-90">{@html caret}</div>
        </a>
      </SummaryRow>

      {#if issuer}
        <SummaryRow>
          <div slot="label">{$translate('app.labels.issuer')}:</div>
          <div slot="value">{issuer}</div>
        </SummaryRow>
      {/if}
    </div>
  {/if}
</Section>

{#if showDisableModal}
  <Modal on:close={toggleDisableModal}>
    <div in:fade|local={{ duration: 250 }} class="w-[25rem] max-w-full">
      <h4 class="font-semibold mb-2 w-full text-2xl">
        {$translate('app.modals.disable_offer.heading')}
      </h4>
      <p>{$translate('app.modals.disable_offer.description')}</p>

      <div class="w-full flex items-center gap-x-4 mt-6">
        <div class="w-1/2">
          <Button on:click={toggleDisableModal} text={$translate('app.buttons.cancel')} />
        </div>

        <div class="w-1/2">
          <Button
            on:click={disableOffer}
            warning
            requesting={disablingOffer}
            text={$translate('app.buttons.disable')}
          >
            <div class="w-6 mr-2 text-utility-error" slot="iconLeft">
              {@html warning}
            </div>
          </Button>
        </div>
      </div>

      {#if disableOfferError}
        <div class="mt-4">
          <Msg bind:message={disableOfferError} type="error" />
        </div>
      {/if}
    </div>
  </Modal>
{/if}
