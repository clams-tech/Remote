<script lang="ts">
  import type { PrismMember, PrismType } from '$lib/@types/plugins'
  import Section from '$lib/components/Section.svelte'
  import SectionHeading from '$lib/components/SectionHeading.svelte'
  import TextInput from '$lib/components/TextInput.svelte'
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
  import { slide } from 'svelte/transition'
  import ErrorDetail from '$lib/components/ErrorDetail.svelte'
  import trashOutline from '$lib/icons/trash-outline.js'

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
  let outlayFactor = 0.99
  let members = [
    {
      description: '',
      destination: '',
      split: 0,
      fees_incurred_by: 'local', // 'local' or 'remote'
      payout_threshold_msat: 0
    }
    // {
    //   description: 'Bob',
    //   destination:
    //     'lno1qgsqvgnwgcg35z6ee2h3yczraddm72xrfua9uve2rlrm9deu7xyfzrc2qajx2enpw4k8g93pqw4m2tsyxz66llufnvnn7jf3g0r23k2kn3sa6gexsvw7u6nce69jg',
    //   split: 1.1,
    //   fees_incurred_by: 'local', // 'local' or 'remote'
    //   payout_threshold_msat: 0
    // }
    // {
    //   description: 'Carol',
    //   destination:
    //     'lno1qgsqvgnwgcg35z6ee2h3yczraddm72xrfua9uve2rlrm9deu7xyfzrc2qajx2enpw4k8g93pq2wslr4p52slqg7kgeudlp2s84wfzt9k57la6et7mm82dezs6xggw',
    //   split: 2.2,
    //   fees_incurred_by: 'local', // 'local' or 'remote'
    //   payout_threshold_msat: 0
    // }
  ]
  let openMembers: string[] = ['0'] // indexes of open member dropdowns

  let createPrismError: AppError | null
  let creatingPrism = false

  const addMember = () => {
    const currentMemberCount = members.length

    members = [
      ...members,
      {
        description: '',
        destination: '',
        split: 0,
        fees_incurred_by: 'local', // 'local' or 'remote'
        payout_threshold_msat: 0
      }
    ]

    // Open dropdown for newly added member
    openMembers = [currentMemberCount.toString()]
  }

  const removeMember = (memberIndex: number) => {
    members = members.filter((_, index) => index !== memberIndex)
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
  // Add form field validation
  // fix error thrown when member split is not a float for whole numbers, eg 2 should be 2.0
  // improve the UX and copy when adding a member, eg Split can be rendered as a %
  // Outlay Factor should be worded so its easier to understand
</script>

<svelte:head>
  <title>{$translate('app.routes./plugins/prism.title')}</title>
</svelte:head>

<Section>
  <SectionHeading icon={prismIcon} />
  <div class="flex flex-col gap-y-4 w-full mt-2 overflow-scroll p-1">
    <TextInput bind:value={description} name="description" label="Name" type="text" />
    <TextInput bind:value={outlayFactor} name="outlayFactor" label="Outlay Factor" type="number" />
    {#if members.length}
      <label class="text-sm w-1/2 text-inherit text-neutral-300 mb-2 font-semibold" for="members">
        Members
      </label>
      {#each members as { description, destination, split, payout_threshold_msat, fees_incurred_by }, i}
        <div class="mt-2 rounded" class:border={openMembers.includes(i.toString())}>
          <!-- svelte-ignore a11y-no-static-element-interactions -->
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <div
            class="rounded p-2 flex items-center justify-between cursor-pointer"
            class:border={!openMembers.includes(i.toString())}
            on:click={() => toggleOpenMember(i)}
          >
            <div class="flex items-center gap-1">
              <div
                class="mr-1.5 w-4 h-4 leading-none flex items-center justify-center rounded-full bg-neutral-900 -mr-1"
              >
                {i + 1}
              </div>
              <p>
                {description ? description : '?'}
              </p>
            </div>
            <div on:click={() => removeMember(i)} class="w-6 cursor-pointer">
              {@html trashOutline}
            </div>
          </div>
          {#if openMembers.includes(i.toString())}
            <div transition:slide={{ duration: 250 }} class="flex flex-col gap-y-4 p-4">
              <TextInput
                bind:value={description}
                name="description"
                label="Name"
                placeholder={'Alice'}
                type="text"
              />
              <TextInput
                bind:value={destination}
                name="destination"
                label="Destination"
                placeholder={'BOLT12 offer or node pubkey'}
                type="text"
              />
              <div class="flex gap-4">
                <TextInput bind:value={split} name="split" label="Split" type="number" />
                <TextInput
                  bind:value={payout_threshold_msat}
                  name="Payout Threshold"
                  label="Payout Threshold (msats)"
                  type="number"
                />
              </div>
              <p>Fees incurred by</p>
              <div class="flex gap-4">
                <label class="flex items-center cursor-pointer">
                  <input type="radio" bind:group={fees_incurred_by} value="local" />
                  <span class="ml-1">local</span>
                </label>
                <label class="flex items-center cursor-pointer">
                  <input type="radio" bind:group={fees_incurred_by} value="remote" />
                  <span class="ml-1">remote</span>
                </label>
              </div>
            </div>
          {/if}
        </div>
      {/each}
    {/if}
  </div>

  {#if createPrismError}
    <div in:slide|local={{ duration: 250 }}>
      <ErrorDetail error={createPrismError} />
    </div>
  {/if}

  {#if $availableWallets$.length}
    <div class="w-full flex justify-end mt-2">
      <div class="w-min">
        <Button on:click={addMember} primary text="Add Member" />
      </div>
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
