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
  import trashOutlineIcon from '$lib/icons/trash-outline.js'
  import ScanIcon from '$lib/icons/scan.js'
  import Scan from '../../../input/Scan.svelte'
  import { isBolt12Offer } from '$lib/input-parser'
  import type { ParsedInput } from '$lib/@types/common'
  import Modal from '$lib/components/Modal.svelte'
  import { base } from '$app/paths'

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

  let description = ''
  let outlay_factor = 1
  let members: PrismMember[] = [
    {
      description: '',
      destination: '',
      split: 1,
      fees_incurred_by: 'remote', // 'local' or 'remote'
      payout_threshold_msat: 0
    }
  ]
  let openMembers: string[] = ['0'] // indexes of open member dropdowns
  let showMemberDestinationModal = false

  let createPrismError: AppError | null
  let creatingPrism = false

  const addMember = () => {
    const currentMemberCount = members.length

    members = [
      ...members,
      {
        description: '',
        destination: '',
        split: 1,
        fees_incurred_by: 'remote',
        payout_threshold_msat: 0
      }
    ]

    // Open dropdown for newly added member
    openMembers = [currentMemberCount.toString()]
  }

  const removeMember = (memberIndex: number) => {
    members = members.filter((_, index) => index !== memberIndex)
  }

  const handleInput = async ({ type, value, lightning }: ParsedInput, memberIndex: number) => {
    if (type === 'node_publickey' || type === 'offer' || (lightning && isBolt12Offer(lightning))) {
      console.log('member index = ', memberIndex)
      members[memberIndex].destination = value
      showMemberDestinationModal = false
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
      prism = (await connection.prism!.createPrism!(description, members, outlay_factor)) || null

      if (prism) {
        await db.prisms.add(prism, prism?.prism_id)
        creatingPrism = false
        goto(`${base}/plugins/prism/${prism.prism_id}?wallet=${wallet}`)
      }
    } catch (error) {
      createPrismError = error as AppError
      creatingPrism = false
    }
  }
</script>

<svelte:head>
  <title>{$translate('app.routes./plugins/prism.title')}</title>
</svelte:head>

<Section>
  <SectionHeading icon={prismIcon} />
  <div class="flex flex-col gap-y-4 w-full mt-2 overflow-scroll p-1">
    <TextInput
      bind:value={description}
      name="description"
      label={$translate('app.labels.name')}
      type="text"
      placeholder={$translate('app.labels.prism_name_placeholder')}
    />
    <TextInput
      bind:value={outlay_factor}
      name="outlayFactor"
      label={$translate('app.labels.outlay_factor')}
      type="number"
    />
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
              {@html trashOutlineIcon}
            </div>
          </div>
          {#if openMembers.includes(i.toString())}
            <div transition:slide={{ duration: 250 }} class="flex flex-col gap-y-4 p-4">
              <TextInput
                bind:value={description}
                name="description"
                label={$translate('app.labels.name')}
                placeholder={'Alice'}
                type="text"
              />
              <TextInput
                bind:value={destination}
                name="destination"
                label={$translate('app.labels.destination')}
                placeholder={$translate('app.labels.member_destination_placeholder')}
                type="text"
              >
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <!-- svelte-ignore a11y-no-static-element-interactions -->
                <div
                  class="ml-2 w-12 cursor-pointer"
                  on:click={() => (showMemberDestinationModal = true)}
                >
                  {@html ScanIcon}
                </div>
              </TextInput>
              {#if showMemberDestinationModal}
                <Modal on:close={() => (showMemberDestinationModal = false)}>
                  <Scan on:input={e => handleInput(e.detail, i)} />
                </Modal>
              {/if}
              <div class="flex flex-col sm:flex-row gap-4">
                <TextInput
                  bind:value={split}
                  name="split"
                  label={$translate('app.labels.split')}
                  type="number"
                />
                <TextInput
                  bind:value={payout_threshold_msat}
                  name="Payout Threshold"
                  label={$translate('app.labels.payout_threshold')}
                  type="number"
                />
              </div>

              <div class="flex flex-col">
                <label
                  class="text-sm w-3/4 text-inherit text-neutral-300 font-semibold mb-1"
                  for="fees_incurred_by"
                >
                  {$translate('app.labels.fees_incurred_by')}
                </label>
                <div class="flex gap-4">
                  <label class="flex items-center cursor-pointer">
                    <input type="radio" bind:group={fees_incurred_by} value="remote" />
                    <span class="ml-1">remote</span>
                  </label>
                  <label class="flex items-center cursor-pointer">
                    <input type="radio" bind:group={fees_incurred_by} value="local" />
                    <span class="ml-1">local</span>
                  </label>
                </div>
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
        <Button
          on:click={addMember}
          primary
          text={`${$translate('app.labels.add')} ${$translate('app.labels.member')}`}
        />
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
