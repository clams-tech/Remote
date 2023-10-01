<script lang="ts">
  import Section from '$lib/components/Section.svelte'
  import SectionHeading from '$lib/components/SectionHeading.svelte'
  import { translate } from '$lib/i18n/translations.js'
  import lightningOutline from '$lib/icons/lightning-outline.js'
  import { combineLatest, map } from 'rxjs'
  import OfferTypeSelector from './OfferTypeSelector.svelte'
  import { connections$, wallets$ } from '$lib/streams.js'
  import Spinner from '$lib/components/Spinner.svelte'
  import Msg from '$lib/components/Msg.svelte'
  import WalletSelector from '$lib/components/WalletSelector.svelte'
  import TextInput from '$lib/components/TextInput.svelte'
  import Button from '$lib/components/Button.svelte'
  import ShowMoar from '$lib/components/ShowMoar.svelte'
  import { slide } from 'svelte/transition'
  import type { Offer } from '$lib/@types/offers.js'
  import ExpirySelector from '$lib/components/ExpirySelector.svelte'
  import type { AppError } from '$lib/@types/errors.js'
  import { goto } from '$app/navigation'
  import { db } from '$lib/db/index.js'
  import ErrorDetail from '$lib/components/ErrorDetail.svelte'
  import { nowSeconds } from '$lib/utils.js'

  const availableWallets$ = combineLatest([wallets$, connections$]).pipe(
    map(([wallets, connections]) =>
      wallets.filter(({ id }) => {
        const connection = connections.find(({ walletId }) => walletId === id)
        return !!connection?.offers?.createPay && !!connection?.offers?.createWithdraw
      })
    )
  )

  let selectedWalletId: string
  let type: 'pay' | 'withdraw'
  let amount: number
  let expiry: number | undefined
  let description: string = ''
  let issuer: string
  let label: string

  let creatingOffer = false
  let createOfferError: AppError | null = null

  const createOffer = async () => {
    createOfferError = null
    creatingOffer = true

    const connection = $connections$.find(({ walletId }) => walletId === selectedWalletId)

    if (!connection) {
      throw {
        key: 'connection_not_available',
        detail: {
          timestamp: nowSeconds(),
          message: `Could not find a connection for wallet: ${
            $availableWallets$.find(({ id }) => id === selectedWalletId)?.label
          }`,
          context: 'Createing offer'
        }
      }
    }

    let offer: Offer | null

    try {
      if (type === 'pay') {
        offer = await connection.offers!.createPay!({
          amount,
          description,
          issuer,
          label,
          expiry
        })
      } else {
        offer = await connection.offers!.createWithdraw!({
          amount,
          description,
          issuer,
          label,
          expiry
        })
      }
    } catch (error) {
      createOfferError = error as AppError
      offer = null
    }

    if (offer) {
      await db.offers.add(offer)
      await goto(`/offers/${offer.id}`)
    }

    creatingOffer = false
  }
</script>

<Section>
  <SectionHeading icon={lightningOutline} text={$translate('app.labels.create_offer')} />

  <div class="flex flex-col gap-y-4 w-full mt-2 overflow-scroll p-1">
    {#if !$availableWallets$}
      <Spinner />
    {:else if !$availableWallets$.length}
      <Msg message={$translate('app.labels.create_offer_unavailable')} type="info" />
    {:else}
      <WalletSelector wallets={$availableWallets$} bind:selectedWalletId />

      <OfferTypeSelector bind:type />

      <TextInput
        type="number"
        label={$translate('app.labels.amount')}
        name="amount"
        bind:value={amount}
        hint={!amount
          ? type === 'pay'
            ? $translate('app.labels.any_amount')
            : $translate('app.labels.required')
          : ''}
        sats={amount}
      />

      <TextInput
        type="text"
        label={$translate('app.labels.label')}
        name="label"
        bind:value={label}
        placeholder={$translate('app.labels.offer_label_placeholder')}
        hint={$translate('app.labels.optional')}
      />

      <div class="text-sm">
        <ShowMoar label={$translate('app.labels.more_options')}>
          <div class="w-full flex flex-col gap-y-4">
            <ExpirySelector allowNeverExpire bind:expiry />

            <TextInput
              type="text"
              label={$translate('app.labels.description')}
              name="description"
              bind:value={description}
              hint={$translate('app.labels.optional')}
              placeholder={$translate('app.labels.offer_description_placeholder')}
            />

            <TextInput
              type="text"
              label={$translate('app.labels.issuer')}
              name="issuer"
              bind:value={issuer}
              hint={$translate('app.labels.optional')}
              placeholder={$translate('app.labels.offer_issuer_placeholder')}
            />
          </div>
        </ShowMoar>
      </div>
    {/if}
  </div>

  <div class="w-full flex justify-end mt-2">
    <div class="w-min">
      <Button
        requesting={creatingOffer}
        disabled={type === 'withdraw' && !amount}
        on:click={createOffer}
        primary
        text={$translate('app.labels.create')}
      />
    </div>
  </div>

  {#if createOfferError}
    <div class="mt-2 w-full" in:slide={{ axis: 'y' }}>
      <ErrorDetail error={createOfferError} />
    </div>
  {/if}
</Section>
