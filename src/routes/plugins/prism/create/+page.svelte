<script lang="ts">
  import type { PrismMember, PrismType } from '$lib/@types/plugins'
  import Section from '$lib/components/Section.svelte'
  import SectionHeading from '$lib/components/SectionHeading.svelte'
  import TextInput from '$lib/components/TextInput.svelte'
  import Toggle from '$lib/components/Toggle.svelte'
  import { translate } from '$lib/i18n/translations'
  import prismIcon from '$lib/icons/prism'
  import { connections$, wallets$ } from '$lib/streams'
  import { nowSeconds } from '$lib/utils'
  import { combineLatest, map } from 'rxjs'
  import type { PageData } from './$types'
  import type { AppError } from '$lib/@types/errors'
  import Button from '$lib/components/Button.svelte'
  import { goto } from '$app/navigation'
  import { db } from '$lib/db'

  export let data: PageData
  const { wallet } = data

  const availableWallets$ = combineLatest([wallets$, connections$]).pipe(
    map(([wallets, connections]) =>
      wallets.filter(({ id }) => {
        const connection = connections.find(({ walletId }) => walletId === id)
        return !!connection?.prism?.listPrisms
      })
    )
  )

  let description = 'Best prism ever'
  let outlayFactor = 0.75
  let members: PrismMember[] = [
    {
      description: 'Bob',
      destination:
        'lno1qgsqvgnwgcg35z6ee2h3yczraddm72xrfua9uve2rlrm9deu7xyfzrc2qajx2enpw4k8g93pqw4m2tsyxz66llufnvnn7jf3g0r23k2kn3sa6gexsvw7u6nce69jg',
      split: 2.2,
      fees_incurred_by: 'local', // 'local' or 'remote'
      payout_threshold_msat: 0
    },
    {
      description: 'Carol',
      destination:
        'lno1qgsqvgnwgcg35z6ee2h3yczraddm72xrfua9uve2rlrm9deu7xyfzrc2qajx2enpw4k8g93pq2wslr4p52slqg7kgeudlp2s84wfzt9k57la6et7mm82dezs6xggw',
      split: 2.2,
      fees_incurred_by: 'local', // 'local' or 'remote'
      payout_threshold_msat: 0
    }
  ]

  let createPrismError
  let creatingPrism = false

  const createPrism = async () => {
    createPrismError = null
    creatingPrism = true

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

    let prism: PrismType | null

    try {
      prism = (await connection.prism!.createPrism!(description, members, outlayFactor)) || null

      if (prism) {
        await db.prisms.add(prism, prism?.prism_id)
        creatingPrism = false
        goto(`/plugins/prism/${prism.prism_id}?wallet=${wallet}`)
      }
    } catch (error) {
      createPrismError = error as AppError
      creatingPrism = false
    }
  }

  // @TODO
  // Add option to add memeber and delete a member
  // fix error thrown when member split is not a float for whole numbers, eg 2 should be 2.0
  // handle create prism error in the UI
</script>

<svelte:head>
  <title>{$translate('app.routes./plugins/prism.title')}</title>
</svelte:head>

<Section>
  <SectionHeading icon={prismIcon} />
  <div class="flex flex-col gap-y-4 w-full mt-2 overflow-scroll p-1">
    <TextInput bind:value={description} name="description" label="Description" type="text" />
    <TextInput bind:value={outlayFactor} name="outlayFactor" label="Outlay Factor" type="number" />
    {#each members as { description, destination, split, fees_incurred_by, payout_threshold_msat }, i}
      <h1 class="text-lg font-bold text-center uppercase">Member {i + 1}</h1>
      <TextInput bind:value={description} name="description" label="Description" type="text" />
      <TextInput bind:value={destination} name="destination" label="Destination" type="text" />
      <div class="flex gap-4">
        <TextInput bind:value={split} name="split" label="Split" type="number" />
        <TextInput
          bind:value={payout_threshold_msat}
          name="Payout Threshold"
          label="Payout Threshold (sats)"
          type="number"
        />
      </div>
      <p>Fees incurred by</p>
      <div class="flex gap-4">
        <Toggle toggled={fees_incurred_by === 'local' ? true : false}>
          <div slot="left" class="mr-2">Local</div>
        </Toggle>
        <Toggle toggled={fees_incurred_by === 'remote' ? true : false}>
          <div slot="left" class="mr-2">Remote</div>
        </Toggle>
      </div>
    {/each}
  </div>

  {#if $availableWallets$.length}
    <div class="w-full flex justify-end mt-2">
      <div class="w-min">
        <Button
          requesting={creatingPrism}
          on:click={createPrism}
          primary
          text={$translate('app.labels.create')}
        />
      </div>
    </div>
  {/if}
</Section>
