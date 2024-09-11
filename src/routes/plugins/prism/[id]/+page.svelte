<script lang="ts">
  import type { PrismType } from '$lib/@types/plugins.js'
  import Section from '$lib/components/Section.svelte'
  import Spinner from '$lib/components/Spinner.svelte'
  import SummaryRow from '$lib/components/SummaryRow.svelte'
  import { formatDate } from '$lib/dates'
  import { db } from '$lib/db'
  import { connections$, wallets$ } from '$lib/streams.js'
  import { nowSeconds, truncateValue } from '$lib/utils.js'
  import { combineLatest, map } from 'rxjs'
  import type { PageData } from './$types.js'
  import type { AppError } from '$lib/@types/errors.js'
  import { translate } from '$lib/i18n/translations.js'
  import Button from '$lib/components/Button.svelte'
  import { goto } from '$app/navigation'
  import Toggle from '$lib/components/Toggle.svelte'
  import CopyValue from '$lib/components/CopyValue.svelte'

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

  let deletePrismError = null
  let deletingPrism = false

  const loadData = async () => {
    loading = true
    prism = (await db.prisms.get(id)) as PrismType
    loading = false
  }

  $: if (id) {
    loadData()
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
  // handle delete prism error
  // Finish the prism details
  // return user to the prisms list and call sync to show the updated list of prisms
  // add the option to bind this prism to an existing offer
  // add warning that a binding has not been added (prism is not functional)

  $: console.log(`prism = `, prism)
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
          <div class="w-full flex gap-2 flex-wrap">
            <SummaryRow>
              <div slot="label">Tips</div>
              <div slot="value"><Toggle toggled={true} /></div>
            </SummaryRow>
            <SummaryRow>
              <div slot="label">Funds for band</div>
              <div slot="value"><Toggle toggled={false} /></div>
            </SummaryRow>
            <SummaryRow>
              <div slot="label">College fund</div>
              <div slot="value"><Toggle toggled={false} /></div>
            </SummaryRow>
          </div>
        </div>
      </SummaryRow>
      <SummaryRow>
        <div slot="label">Members</div>
        <div slot="value">
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
        </div>
      </SummaryRow>
      {#if $availableWallets$.length}
        <div class="w-full flex justify-end mt-2">
          <div class="w-min">
            <Button
              requesting={deletingPrism}
              on:click={deletePrism}
              primary
              text={$translate('app.labels.delete')}
            />
          </div>
        </div>
      {/if}
    {:else}
      <!-- @TODO style error message -->
      <div>Prism not found!</div>
    {/if}
  </div>
</Section>
