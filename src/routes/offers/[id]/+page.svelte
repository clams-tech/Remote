<script lang="ts">
  import Spinner from '$lib/components/Spinner.svelte'
  import { translate } from '$lib/i18n/translations'
  import warning from '$lib/icons/warning'
  import type { PageData } from './$types'
  import { connections$ } from '$lib/streams'
  import { fade, slide } from 'svelte/transition'
  import ExpiryCountdown from '$lib/components/ExpiryCountdown.svelte'
  import trendingUp from '$lib/icons/trending-up'
  import trendingDown from '$lib/icons/trending-down'
  import { db } from '$lib/db/index.js'
  import { liveQuery, type PromiseExtended } from 'dexie'
  import { Observable, filter, from, map, mergeMap, of, switchMap, timer } from 'rxjs'
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
  import ErrorDetail from '$lib/components/ErrorDetail.svelte'
  import type { InvoicePayment } from '$lib/@types/payments.js'
  import trashOutline from '$lib/icons/trash-outline.js'
  import type { PrismType } from '$lib/@types/plugins'
  import prismIcon from '$lib/icons/prism'
  import { base } from '$app/paths'

  export let data: PageData

  let offerNotFound: boolean

  let bindingPrism: PrismType

  const offer$ = from(
    liveQuery(() =>
      db.offers.get(data.id).then(offer => {
        offerNotFound = !offer
        return offer
      })
    )
  )

  $: {
    if ($offer$) {
      db.prismBindings.get($offer$?.id).then(prismBinding => {
        if (prismBinding) {
          db.prisms.get(prismBinding.prism_id).then(prism => {
            bindingPrism = prism
          })
        }
      })
    }
  }

  const offerPayments$: Observable<InvoicePayment[]> = offer$.pipe(
    filter(x => !!x),
    switchMap(offer => {
      const query =
        offer?.type === 'withdraw'
          ? {
              'data.direction': 'send',
              'data.amount': offer.amount
            }
          : { 'data.offer.id': offer?.id }

      return from(
        liveQuery(
          () =>
            db.payments
              .where(query)
              .filter(payment => {
                const { data } = payment as InvoicePayment

                return (
                  data.offer?.description === offer?.description &&
                  data.offer?.issuer === offer?.issuer &&
                  (offer?.type === 'withdraw' ? !data.offer?.id : !!data.offer?.id)
                )
              })
              .reverse()
              .sortBy('completedAt') as PromiseExtended<InvoicePayment[]>
        )
      )
    })
  )

  const offerWallet$ = from(offer$).pipe(
    mergeMap(offer => (offer ? db.wallets.get(offer.walletId) : of(null)))
  )

  const now$ = timer(0, 1000).pipe(map(nowSeconds))

  $: status =
    $offer$?.expiry && $offer$?.expiry < $now$
      ? 'expired'
      : $offer$?.active
      ? 'active'
      : $offer$?.singleUse && $offer$?.used
      ? 'complete'
      : 'disabled'

  let showDisableModal = false
  let disablingOffer = false
  let disableOfferError: AppError | null = null

  function toggleDisableModal() {
    showDisableModal = !showDisableModal
  }

  async function disableOffer() {
    disablingOffer = true
    disableOfferError = null

    const connection = $connections$.find(({ walletId }) => walletId === $offer$?.walletId)

    if (!connection) {
      throw {
        key: 'connection_not_available',
        detail: {
          timestamp: nowSeconds(),
          message: `Could not find connection for wallet: ${$offerWallet$?.label}`,
          context: 'Disabling offer'
        }
      }
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
      disableOfferError = error as AppError
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
    {@const { label, amount, issuer, walletId, type, description, expiry, bolt12, active } =
      $offer$}
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

      {#if bindingPrism}
        <SummaryRow>
          <div slot="label">
            <div class="flex">
              <div in:fade={{ duration: 250 }} class="w-[1.5em]">
                {@html prismIcon}
              </div>
            </div>
          </div>
          <div slot="value">
            {bindingPrism?.description}
          </div>
        </SummaryRow>
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
        <a slot="value" href={`${base}/wallets/${walletId}`} class="flex items-center no-underline">
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

      {#if active}
        <div class="w-full flex justify-end mt-4">
          <div class="w-min">
            <Button text={$translate('app.labels.disable')} on:click={toggleDisableModal}>
              <div class="w-6 mr-1 -ml-2" slot="iconLeft">{@html trashOutline}</div>
            </Button>
          </div>
        </div>
      {/if}
    </div>
  {/if}
</Section>

{#if showDisableModal}
  <Modal on:close={toggleDisableModal}>
    <div in:fade|local={{ duration: 250 }} class="w-[25rem] max-w-full">
      <h4 class="font-semibold mb-2 w-full text-2xl">
        {$translate('app.labels.disable_offer')}
      </h4>
      <p>{$translate('app.labels.disable_offer_description')}</p>

      <div class="w-full flex items-center gap-x-4 mt-6">
        <div class="w-1/2">
          <Button on:click={toggleDisableModal} text={$translate('app.labels.cancel')} />
        </div>

        <div class="w-1/2">
          <Button
            on:click={disableOffer}
            warning
            requesting={disablingOffer}
            text={$translate('app.labels.disable')}
          >
            <div class="w-6 mr-2 text-utility-error" slot="iconLeft">
              {@html warning}
            </div>
          </Button>
        </div>
      </div>

      {#if disableOfferError}
        <div in:slide class="mt-2">
          <ErrorDetail bind:error={disableOfferError} />
        </div>
      {/if}
    </div>
  </Modal>
{/if}
