<script lang="ts">
  import type { PrismType } from '$lib/@types/plugins.js'
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

  export let data: PageData
  const { id, wallet } = data // id of prism and wallet id of associated wallet

  const availableWallets$ = combineLatest([wallets$, connections$]).pipe(
    map(([wallets, connections]) =>
      wallets.filter(({ id }) => {
        const connection = connections.find(({ walletId }) => walletId === id)
        return !!connection?.prism?.listPrisms
      })
    )
  )

  let loading = false
  let prism: PrismType | null = null

  let bindPrismError: AppError | null = null
  let bindingPrism = false

  let showClosePrismModal = false
  let deletePrismError: AppError | null = null
  let deletingPrism = false

  const loadData = async () => {
    loading = true
    const result = await db.prisms.get(id)

    if (result) {
      prism = result
    }

    loading = false
  }

  $: if (id) {
    loadData()
  }

  const createBinding = async (offer_id: string) => {
    bindPrismError = null
    bindingPrism = true

    const connection = $connections$.find(({ walletId }) => walletId === wallet)

    if (!connection) {
      throw {
        key: 'connection_not_available',
        detail: {
          timestamp: nowSeconds(),
          message: `Could not find a connection for wallet: ${
            $availableWallets$.find(({ id }) => id === wallet)?.label
          }`,
          context: 'Creating offer'
        }
      }
    }

    try {
      console.log(`trying to bind prism!!`)
      const bindedPrism = (await connection.prism!.createBinding!(id, offer_id)) || null

      if (bindedPrism) {
        console.log(`bindedPrism = `, bindedPrism)
        bindingPrism = false
        // TODO
        // update the prism in the DB
        // fetch prism bindings
      }
    } catch (error) {
      console.log(`error = `, error)
      bindPrismError = error as AppError
      bindingPrism = false
    }
  }

  const deletePrism = async () => {
    deletePrismError = null
    deletingPrism = true

    const connection = $connections$.find(({ walletId }) => walletId === wallet)

    if (!connection) {
      throw {
        key: 'connection_not_available',
        detail: {
          timestamp: nowSeconds(),
          message: `Could not find a connection for wallet: ${
            $availableWallets$.find(({ id }) => id === wallet)?.label
          }`,
          context: 'Creating offer'
        }
      }
    }

    try {
      const deletedPrism = (await connection.prism!.deletePrism!(id)) || null

      if (deletedPrism) {
        await db.prisms.delete(id)
        deletingPrism = false
        goto(`/plugins/prism?wallet=${wallet}`)
      }
    } catch (error) {
      deletePrismError = error as AppError
      deletingPrism = false
    }
  }

  // @TODO
  // Finish the prism details
  // add the option to bind this prism to an existing offer
  // add warning that a binding has not been added (prism is not functional)
  // add delete binding functionality to the toggles

  $: console.log(`prism = `, prism)

  const offers$ = from(
    liveQuery(() =>
      db.offers.toArray().then(offers => {
        return offers
      })
    )
  )
</script>

<Section>
  <div class="w-full flex flex-col items-center h-full overflow-auto">
    {#if loading}
      <Spinner />
    {:else if prism}
      {@const { description, timestamp, outlay_factor, prism_members } = prism}
      <SummaryRow>
        <div slot="label">Name</div>
        <div slot="value">
          {description}
        </div>
      </SummaryRow>
      <SummaryRow>
        <div slot="label">Created</div>
        <div slot="value">
          {#await formatDate(timestamp, 'do MMM hh:mma') then formatted}
            <div>{formatted}</div>
          {/await}
        </div>
      </SummaryRow>
      <SummaryRow>
        <div slot="label">Outlay factor</div>
        <div slot="value">
          <div>{outlay_factor}</div>
        </div>
      </SummaryRow>
      <SummaryRow>
        <div slot="label">Binding</div>
        <div slot="value">
          {#if $offers$?.length}
            <p class="font-bold">Offers</p>
            {#each $offers$ as { id, label, description, bolt12 }}
              <SummaryRow>
                <div slot="label">{label || description || truncateValue(bolt12, 5)}</div>
                <div slot="value"><Toggle toggled={true} on:click={() => createBinding(id)} /></div>
              </SummaryRow>
            {/each}
          {:else}
            <p>No offers found, create one (link to offers page)</p>
          {/if}
        </div>
      </SummaryRow>
      <SummaryRow>
        <div slot="label">Members</div>
        <div slot="value">
          {#if prism_members?.length}
            <div class="flex gap-2 flex-wrap justify-end">
              {#each prism_members as { description, destination, split, fees_incurred_by, payout_threshold_msat }, index}
                <div class="p-2 border rounded w-full md:w-auto">
                  <SummaryRow>
                    <div slot="label">
                      <div
                        class="w-6 h-6 leading-none flex items-center justify-center rounded-full bg-neutral-900 -mr-1"
                      >
                        {index + 1}
                      </div>
                    </div>
                  </SummaryRow>
                  <SummaryRow>
                    <div slot="label">Description</div>
                    <div slot="value">{description}</div>
                  </SummaryRow>
                  <SummaryRow>
                    <div slot="label">Destination</div>
                    <div slot="value">
                      <CopyValue value={destination} label={truncateValue(destination, 5)} />
                    </div>
                  </SummaryRow>
                  <SummaryRow>
                    <div slot="label">Split</div>
                    <div slot="value">{split}</div>
                  </SummaryRow>
                  <SummaryRow>
                    <div slot="label">Fees incurred by</div>
                    <div slot="value">{fees_incurred_by}</div>
                  </SummaryRow>
                  <SummaryRow>
                    <div slot="label">Payout threshold</div>
                    <div slot="value">{payout_threshold_msat}</div>
                  </SummaryRow>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </SummaryRow>

      {#if $availableWallets$.length}
        <div class="w-full flex justify-end mt-2">
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
            <h4 class="font-semibold mb-2 w-full text-2xl">Delete Prism</h4>

            <div>Are you sure you want to delete this Prism?</div>

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
                  on:click={deletePrism}
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
      <!-- @TODO style error message -->
      <div>Prism not found!</div>
    {/if}
  </div>
</Section>
