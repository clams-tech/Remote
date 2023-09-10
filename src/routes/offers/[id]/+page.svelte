<script lang="ts">
  import Spinner from '$lib/components/Spinner.svelte'
  import { translate } from '$lib/i18n/translations'
  import warning from '$lib/icons/warning'
  import type { PageData } from './$types'
  import { connections$ } from '$lib/streams'
  import { fade } from 'svelte/transition'
  import ExpiryCountdown from '$lib/components/ExpiryCountdown.svelte'
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
  import SummaryRow from '$lib/components/SummaryRow.svelte'
  import BitcoinAmount from '$lib/components/BitcoinAmount.svelte'
  import caret from '$lib/icons/caret.js'
  import Qr from '$lib/components/Qr.svelte'
  import PaymentsList from './PaymentsList.svelte'
  import { formatDateRelativeToNow } from '$lib/dates.js'

  export let data: PageData

  let offerNotFound: boolean

  const offer$ = liveQuery(() =>
    db.offers.get(data.id).then((offer) => {
      offerNotFound = !offer
      return offer
    })
  )

  const offerPayments$ = liveQuery(() =>
    db.invoices.where({ 'offer.id': data.id }).reverse().sortBy('completedAt')
  )

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
  {#if offerNotFound}
    <div class="w-full mt-4">
      <Msg message={$translate('app.errors.could_not_find_offer')} type="error" />
    </div>
  {:else if !$offer$}
    <div class="mt-4">
      <Spinner />
    </div>
  {:else}
    {@const { label, amount, issuer, walletId, type, description, expiry, bolt12, id } = $offer$}
    <div class="w-full">
      <div class="text-3xl font-semibold flex items-center justify-center w-full">
        <div class="flex items-center">
          <div
            class="w-10 mr-1 -ml-1"
            class:text-utility-success={type === 'pay'}
            class:text-utility-error={type === 'withdraw'}
          >
            {@html type === 'pay' ? trendingUp : trendingDown}
          </div>

          <div>{$translate(`app.labels.${type}`)}</div>
          <div class="ml-1">{$translate('app.labels.offer').toLowerCase()}</div>
        </div>
      </div>
      {#if status === 'active'}
        <div class="flex flex-col w-full items-center my-4">
          <Qr values={[{ label: $translate('app.labels.offer'), value: bolt12 }]} />

          {#if expiry}
            <ExpiryCountdown {expiry} />
          {/if}
        </div>
      {/if}

      <SummaryRow>
        <div slot="label">{$translate('app.labels.status')}</div>
        <div
          slot="value"
          class:text-utility-success={status === 'active' || status === 'complete'}
          class:text-utility-error={status === 'expired' || status === 'disabled'}
          class="flex items-center justify-end"
        >
          <div
            class:bg-utility-success={status === 'active' || status === 'complete'}
            class:bg-utility-error={status === 'expired' || status === 'disabled'}
            class="w-2 h-2 rounded-full mr-1"
          />
          <div>{$translate(`app.labels.${status}`)}</div>
        </div>
      </SummaryRow>

      {#if expiry && status === 'expired'}
        <SummaryRow>
          <div slot="label">{$translate('app.labels.expired')}:</div>
          <div slot="value">
            {#await formatDateRelativeToNow(expiry) then formatted}
              {formatted}
            {/await}
          </div>
        </SummaryRow>
      {/if}

      {#if label}
        <SummaryRow>
          <div slot="label">{$translate('app.labels.label')}:</div>
          <div slot="value">{label}</div>
        </SummaryRow>
      {/if}

      {#if description}
        <SummaryRow>
          <div slot="label">{$translate('app.labels.description')}:</div>
          <div slot="value">{description}</div>
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

      {#if $offerPayments$ && $offerPayments$.length}
        <SummaryRow baseline>
          <div slot="label">
            {$translate(`app.labels.${type === 'pay' ? 'payments' : 'withdrawals'}`)}:
          </div>
          <div slot="value" class="w-full">
            <PaymentsList payments={$offerPayments$} />
          </div>
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
