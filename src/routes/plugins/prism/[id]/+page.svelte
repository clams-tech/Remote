<script lang="ts">
  import Section from '$lib/components/Section.svelte'
  import Spinner from '$lib/components/Spinner.svelte'
  import SummaryRow from '$lib/components/SummaryRow.svelte'
  import { formatDate } from '$lib/dates'
  import { db } from '$lib/db'
  import { connections$, wallets$ } from '$lib/streams.js'
  import { nowSeconds, truncateValue } from '$lib/utils.js'
  import { combineLatest, from, map } from 'rxjs'
  import type { PageData } from './$types.js'
  import type { AppError } from '$lib/@types/errors.js'
  import { translate } from '$lib/i18n/translations.js'
  import Button from '$lib/components/Button.svelte'
  import { goto } from '$app/navigation'
  import Toggle from '$lib/components/Toggle.svelte'
  import CopyValue from '$lib/components/CopyValue.svelte'
  import { liveQuery } from 'dexie'
  import warning from '$lib/icons/warning.js'
  import Modal from '$lib/components/Modal.svelte'
  import ErrorDetail from '$lib/components/ErrorDetail.svelte'
  import { slide } from 'svelte/transition'
  import {
    createPrismBinding,
    deletePrism,
    deletePrismBinding,
    fetchPrismBindings,
    fetchPrisms
  } from '$lib/wallets/index.js'
  import Msg from '$lib/components/Msg.svelte'

  export let data: PageData
  const { id, wallet } = data // id of prism and wallet id of associated wallet
  let loading = false

  const availableWallets$ = combineLatest([wallets$, connections$]).pipe(
    map(([wallets, connections]) =>
      wallets.filter(({ id }) => {
        const connection = connections.find(({ walletId }) => walletId === id)
        return !!connection?.prism?.listPrisms
      })
    )
  )

  let bindPrismError: AppError | null = null
  let bindingPrism = false
  let boundOfferIds: string[] = []
  let showClosePrismModal = false
  let deletePrismError: AppError | null = null
  let deletingPrism = false
  let openMembers: string[] = [] // indexes of open member dropdowns

  $: connection = $connections$.find(({ walletId }) => walletId === wallet)

  const prism$ = from(
    liveQuery(() =>
      db.prisms.toArray().then(prisms => {
        return prisms.find(prism => prism.id === id)
      })
    )
  )

  const activeOffers$ = from(
    liveQuery(() =>
      db.offers.toArray().then(offers => {
        return offers.filter(offer => offer.active)
      })
    )
  )

  const prismBindings$ = from(
    liveQuery(() =>
      db.prismBindings.toArray().then(prismBindings => {
        return prismBindings
      })
    )
  )

  // Keep binding toggles in sync with offers bound to this prism in local DB
  $: {
    boundOfferIds = []
    $prismBindings$?.forEach(prismBinding => {
      if (prismBinding.prism_id === id) {
        boundOfferIds.push(prismBinding.offer_id)
      }
    })
  }

  const toggleBinding = async (offer_id: string) => {
    bindPrismError = null

    if (!connection) {
      throw {
        key: 'connection_not_available',
        detail: {
          timestamp: nowSeconds(),
          message: `Could not find a connection for wallet: ${
            $availableWallets$.find(({ id }) => id === wallet)?.label
          }`,
          context: 'Updating prism'
        }
      }
    }

    try {
      bindingPrism = true

      if (boundOfferIds.includes(offer_id)) {
        await deletePrismBinding(connection, offer_id)
      } else {
        await createPrismBinding(connection, id, offer_id)
      }

      await Promise.all([fetchPrisms(connection), fetchPrismBindings(connection)])
    } catch (error) {
      bindPrismError = error as AppError
      bindingPrism = false
    }
  }

  const toggleOpenMember = (memberIndex: number) => {
    // close an open member dropdown
    if (openMembers.includes(memberIndex.toString())) {
      openMembers = openMembers.filter(member => member !== memberIndex.toString())
      return
    } else {
      // open a closed member dropdown
      openMembers = [...openMembers, memberIndex.toString()]
    }
  }

  const handleDeletePrism = async () => {
    if (!connection) {
      throw {
        key: 'connection_not_available',
        detail: {
          timestamp: nowSeconds(),
          message: `Could not find a connection for wallet: ${
            $availableWallets$.find(({ id }) => id === wallet)?.label
          }`,
          context: 'Deleting prism'
        }
      }
    }

    deletePrismError = null
    deletingPrism = true

    try {
      // Remove all existing bindings before deleting prism
      if (boundOfferIds.length) {
        boundOfferIds.forEach(async boundOfferId => {
          await deletePrismBinding(connection, boundOfferId)
        })
      }
      const deletedPrism = await deletePrism(connection, id)

      if (deletedPrism) {
        deletingPrism = false
        goto(`/plugins/prism?wallet=${wallet}`)
      }
    } catch (error) {
      deletePrismError = error as AppError
      deletingPrism = false
    }
  }
</script>

<Section>
  <div class="w-full flex flex-col items-center h-full overflow-auto">
    {#if loading}
      <Spinner />
    {:else if $prism$}
      {@const { description, timestamp, outlay_factor, prism_members } = $prism$}
      <SummaryRow>
        <div slot="label">{$translate('app.labels.status')}</div>
        <div slot="value">
          <p
            class:text-utility-error={!boundOfferIds.length}
            class:text-utility-success={boundOfferIds.length}
          >
            {boundOfferIds.length ? 'Active' : 'Inactive'}
          </p>
        </div>
      </SummaryRow>
      <SummaryRow>
        <div slot="label">{$translate('app.labels.name')}</div>
        <div slot="value">
          {description}
        </div>
      </SummaryRow>
      <SummaryRow>
        <div slot="label">{$translate('app.labels.created')}</div>
        <div slot="value">
          {#await formatDate(timestamp, 'do MMM hh:mma') then formatted}
            <div>{formatted}</div>
          {/await}
        </div>
      </SummaryRow>
      <SummaryRow>
        <div slot="label">{$translate('app.labels.outlay_factor')}</div>
        <div slot="value">
          <div>{outlay_factor}</div>
        </div>
      </SummaryRow>
      <SummaryRow>
        <div slot="label">{$translate('app.labels.binding')}</div>
        <div slot="value">
          {#if $activeOffers$?.length}
            <p class="font-bold">{$translate('app.labels.offers')}</p>
            {#each $activeOffers$ as { id, label, description, bolt12 }}
              <SummaryRow>
                <div slot="label" class="flex gap-1">
                  <a class="no-underline" href={`/offers/${id}`}>
                    <Button
                      disabled={!boundOfferIds.includes(id)}
                      text={label || description || truncateValue(bolt12, 5)}
                    />
                  </a>
                </div>
                <div slot="value">
                  <Toggle
                    disabled={bindingPrism}
                    toggled={boundOfferIds.includes(id)}
                    on:click={() => toggleBinding(id)}
                  />
                </div>
              </SummaryRow>
            {/each}
          {:else}
            <p>
              {$translate('app.labels.no_active_offers_found')},
              <a href="/offers">{$translate('app.labels.create_one')}</a>
            </p>
          {/if}
          {#if bindPrismError}
            <div in:slide|local={{ duration: 250 }}>
              <ErrorDetail error={bindPrismError} />
            </div>
          {/if}
        </div>
      </SummaryRow>
      <SummaryRow>
        <div slot="label">{$translate('app.labels.members')}</div>
        <div slot="value">
          {#if prism_members?.length}
            {#each prism_members as { description, destination, split, fees_incurred_by, payout_threshold_msat }, i}
              <div class="mt-2 rounded" class:border={openMembers.includes(i.toString())}>
                <!-- svelte-ignore a11y-no-static-element-interactions -->
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <div
                  class="rounded p-2 flex items-center gap-1 cursor-pointer w-[100%]"
                  class:border={!openMembers.includes(i.toString())}
                  on:click={() => toggleOpenMember(i)}
                >
                  <div
                    class="mr-1.5 w-4 h-4 leading-none flex items-center justify-center rounded-full bg-neutral-900 -mr-1"
                  >
                    {i + 1}
                  </div>
                  <p>
                    {description ? description : '?'}
                  </p>
                </div>
                {#if openMembers.includes(i.toString())}
                  <div transition:slide={{ duration: 250 }} class="flex flex-col p-2">
                    <SummaryRow>
                      <div slot="label">{$translate('app.labels.destination')}</div>
                      <div slot="value">
                        <CopyValue value={destination} label={truncateValue(destination, 5)} />
                      </div>
                    </SummaryRow>
                    <SummaryRow>
                      <div slot="label">{$translate('app.labels.split')}</div>
                      <div slot="value">{split}</div>
                    </SummaryRow>
                    <SummaryRow>
                      <div slot="label">{$translate('app.labels.fees_incurred_by')}</div>
                      <div slot="value">{fees_incurred_by}</div>
                    </SummaryRow>
                    <SummaryRow>
                      <div slot="label">{$translate('app.labels.payout_threshold')}</div>
                      <div slot="value">{payout_threshold_msat}</div>
                    </SummaryRow>
                  </div>
                {/if}
              </div>
            {/each}
          {/if}
        </div>
      </SummaryRow>

      {#if $availableWallets$.length}
        <div class="w-full flex justify-end mt-4 gap-2">
          <div class="w-min">
            <Button
              warning
              on:click={() => (showClosePrismModal = true)}
              text={$translate('app.labels.delete')}
            >
              <div slot="iconLeft" class="w-6 mr-1 -ml-2">{@html warning}</div>
            </Button>
          </div>
        </div>
      {/if}

      {#if showClosePrismModal}
        <Modal
          on:close={() => {
            showClosePrismModal = false
          }}
        >
          <div class="w-[25rem] max-w-full gap-y-4 flex flex-col overflow-hidden h-full">
            <h4 class="font-semibold mb-2 w-full text-2xl">
              {$translate('app.labels.delete')}
              {$translate('app.labels.prism')}
            </h4>
            <div>{$translate('app.labels.delete_prism_warning')}</div>
            {#if deletePrismError}
              <div in:slide|local={{ duration: 250 }}>
                <ErrorDetail error={deletePrismError} />
              </div>
            {/if}

            <div class="mt-2 w-full flex justify-end">
              <div class="w-min">
                <Button
                  warning
                  requesting={deletingPrism}
                  on:click={handleDeletePrism}
                  text={$translate('app.labels.delete')}
                >
                  <div slot="iconLeft" class="w-6 mr-1 -ml-2">{@html warning}</div></Button
                >
              </div>
            </div>
          </div>
        </Modal>
      {/if}
    {:else}
      <Msg type="error" closable={false} message={'Could not find this Prism.'} />
    {/if}
  </div>
</Section>
