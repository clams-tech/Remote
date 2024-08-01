<script lang="ts">
  import type { ClbossStatus } from '$lib/@types/plugins'
  import Button from '$lib/components/Button.svelte'
  import Section from '$lib/components/Section.svelte'
  import SectionHeading from '$lib/components/SectionHeading.svelte'
  import Spinner from '$lib/components/Spinner.svelte'
  import TextInput from '$lib/components/TextInput.svelte'
  import Toggle from '$lib/components/Toggle.svelte'
  import Tooltip from '$lib/components/Tooltip.svelte'
  import terminal from '$lib/icons/terminal'
  import link from '$lib/icons/link.js'
  import refresh from '$lib/icons/refresh'
  import CopyValue from '$lib/components/CopyValue.svelte'
  import SummaryRow from '$lib/components/SummaryRow.svelte'
  import { connections$ } from '$lib/streams'
  import { from } from 'rxjs'
  import { liveQuery } from 'dexie'
  import { db } from '$lib/db/index.js'
  import { truncateValue } from '$lib/utils'
  import { formatDate } from '$lib/dates'
  import type { Connection } from '$lib/wallets/interfaces'
  import type { PageData } from './$types'
  import type { Channel } from './@types/channels.js'
  import { fade } from 'svelte/transition'

  export let data: PageData
  const { wallet } = data

  let loading = true
  let clbossActive = false
  let clbossStatus: ClbossStatus | null = null
  let ignoringOnchainFunds = false
  let ignoreOnchainHours = 24

  enum ChannelManageCategories {
    LNFEE = 'lnfee',
    OPEN = 'open',
    CLOSE = 'close',
    BALANCE = 'balance'
  }

  let managed: Record<string, Record<ChannelManageCategories, boolean>> = {}

  const activeChannel$ = from(
    liveQuery(() =>
      db.channels
        .toArray()
        .then(channels =>
          channels.filter(({ walletId, status }) => walletId === wallet && status === 'active')
        )
    )
  )

  $: connection = $connections$.find(({ walletId }) => walletId === wallet) as Connection

  $: {
    if (connection) {
      connection.plugins?.list().then(plugins => {
        const clbossPlugin = plugins.find(plugin => plugin.name.includes('clboss'))
        clbossActive = clbossPlugin ? clbossPlugin.active : false
        getStatus()
      })
    }
  }

  $: ignoringOnchainFunds = clbossStatus?.should_monitor_onchain_funds?.status === 'ignore'

  $: if ($activeChannel$?.length && clbossStatus?.unmanaged) {
    updateManagedChannels($activeChannel$, clbossStatus.unmanaged)
  }

  function getStatus() {
    loading = true
    connection.clboss?.getStatus().then(response => {
      clbossStatus = response
      console.log(`clboss status = `, clbossStatus)
      loading = false
    })
  }

  function ignoreOnchain() {
    connection.clboss?.ignoreOnchain(ignoreOnchainHours).then(getStatus)
  }

  function noticeOnchain() {
    connection.clboss?.noticeOnchain().then(getStatus)
  }

  function unmanage(nodeId: string, tag: ChannelManageCategories) {
    const managedCategories = { ...managed[nodeId], [tag]: !managed[nodeId][tag] }
    const tags = Object.keys(managedCategories)
      .filter(key => managedCategories[key as ChannelManageCategories])
      .join(',')
    connection.clboss?.unmanage(nodeId, tags).then(getStatus)
  }

  function updateManagedChannels(
    activeChannels: Channel[],
    statusUnmanaged: ClbossStatus['unmanaged']
  ) {
    activeChannels.forEach(({ peerId }) => {
      const unmanagedCategories = statusUnmanaged[peerId]
      managed[peerId] = unmanagedCategories
        ? {
            [ChannelManageCategories.LNFEE]: unmanagedCategories.includes('lnfee'),
            [ChannelManageCategories.OPEN]: unmanagedCategories.includes('open'),
            [ChannelManageCategories.CLOSE]: unmanagedCategories.includes('close'),
            [ChannelManageCategories.BALANCE]: unmanagedCategories.includes('balance')
          }
        : {
            [ChannelManageCategories.LNFEE]: true,
            [ChannelManageCategories.OPEN]: true,
            [ChannelManageCategories.CLOSE]: true,
            [ChannelManageCategories.BALANCE]: true
          }
    })
  }

  function startClboss() {
    connection?.plugins?.start('clboss').then(getStatus)
  }
</script>

{#if loading}
  <div class="mt-8">
    <Spinner size="1.5em" />
  </div>
{:else}
  <Section>
    <div class="flex items-center justify-between gap-x-4">
      <SectionHeading icon={terminal} />
    </div>
    <p>
      A goal of CLBOSS is that you never have to monitor or check your node, or CLBOSS, at all.
      Nevertheless, CLBOSS exposes a few commands.
    </p>
    {#if clbossActive}
      <!-- STATUS -->
      <h1 class="mt-8 text-lg font-bold flex justify-center gap-2">
        STATUS
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div
          class="w-6 cursor-pointer"
          on:click|stopPropagation={getStatus}
          class:animate-spin={loading}
        >
          {@html refresh}
        </div>
      </h1>
      <div class="mt-4">
        <SummaryRow>
          <div slot="label">Internet</div>
          <div slot="value">{clbossStatus?.internet?.connection}</div>
        </SummaryRow>
        <SummaryRow>
          <div slot="label">Onchain Fee Rate</div>
          <div slot="value">
            <p
              class:text-utility-success={clbossStatus?.onchain_feerate?.judgment === 'low fees'}
              class:text-utility-error={clbossStatus?.onchain_feerate?.judgment === 'high fees'}
            >
              {clbossStatus?.onchain_feerate?.judgment || '-'}
            </p>
          </div>
        </SummaryRow>
        <SummaryRow>
          <div slot="label">Channel Candidates</div>
          <div slot="value">
            {#if clbossStatus}
              <div class="max-h-[5em] overflow-scroll">
                {#if clbossStatus?.channel_candidates.length}
                  {#each clbossStatus?.channel_candidates as candidate, index}
                    <div class="grid grid-cols-2 gap-2">
                      <p>
                        {`${index + 1})`}
                      </p>
                      <div class="flex justify-between">
                        <p>{truncateValue(candidate?.id, 4)}</p>
                        <a
                          href={`https://amboss.space/node/${candidate?.id}`}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          <div in:fade|local={{ duration: 250 }} class="m-auto w-6 cursor-pointer">
                            {@html link}
                          </div></a
                        >
                      </div>
                    </div>
                  {/each}
                {:else}
                  <p>none</p>
                {/if}
              </div>
            {/if}
          </div>
        </SummaryRow>
        <SummaryRow>
          <div slot="label">Peer Metrics</div>
          <div slot="value">
            {#if clbossStatus?.peer_metrics && Object.keys(clbossStatus?.peer_metrics).length}
              <CopyValue value={JSON.stringify(clbossStatus?.peer_metrics)} hideValue={true} />
            {:else}
              <p>none</p>
            {/if}
          </div>
        </SummaryRow>
        {#if ignoringOnchainFunds && clbossStatus?.should_monitor_onchain_funds}
          <SummaryRow>
            <!-- TODO - fix copy on mobile -->
            <div slot="label" class="flex flex-wrap">
              Ignoring onchain funds until
              {#await formatDate(clbossStatus?.should_monitor_onchain_funds.disable_until, 'HH:mm - yyyy-MM-dd') then response}
                {response}
              {/await}
            </div>
            <div slot="value">
              <div class="w-min"><Button text="Disable" on:click={noticeOnchain} /></div>
            </div>
          </SummaryRow>
        {/if}
      </div>
      <!-- COMMANDS -->
      <h1 class="mt-8 text-lg font-bold text-center">COMMANDS</h1>
      <div class="mt-4 flex flex-col gap-4">
        <!-- IGNORE / NOTICE ONCHAIN -->
        <div class="flex flex-col gap-4">
          <TextInput
            name="ignoreOnchain"
            type="number"
            label="Ignore onchain funds (hours)"
            placeholder="Number of hours CLBOSS should ignore onchain balance"
            bind:value={ignoreOnchainHours}
          />
          <div class="w-min"><Button text="Update" on:click={ignoreOnchain} /></div>
        </div>
        <!-- UNMANAGE -->
        <div class="mt-4 flex flex-col gap-4">
          <table class="table-auto border-collapse border border-slate-600 w-full">
            <caption class="caption-top text-sm mb-4">
              Toggle CLBOSS permissions on a per channel basis
            </caption>
            <thead>
              <tr>
                {#each ['Alias', 'Node Id', 'Permissions'] as header}
                  <th class="p-2 border border-slate-600">{header}</th>
                {/each}
              </tr>
            </thead>
            <tbody class="max-h-[5em]">
              {#if $activeChannel$.length && managed}
                {#each $activeChannel$ as { peerAlias, peerId }}
                  <tr>
                    <td class="p-2 border border-slate-600">{peerAlias}</td>
                    <td class="p-2 border border-slate-600">
                      {#if peerId}
                        <div class="flex flex-wrap justify-between items-center gap-1">
                          <p>{truncateValue(peerId, 4)}</p>
                          <CopyValue value={peerId} hideValue={true} />
                          <a
                            href={`https://amboss.space/node/${peerId}`}
                            rel="noopener noreferrer"
                            target="_blank"
                          >
                            <div in:fade|local={{ duration: 250 }} class="w-6 cursor-pointer">
                              {@html link}
                            </div></a
                          >
                        </div>
                      {:else}
                        -
                      {/if}</td
                    >
                    {#if peerId}
                      <td class="p-2 border border-slate-600">
                        <div class="flex flex-wrap justify-between items-center gap-2">
                          {#each Object.values(ChannelManageCategories) as category}
                            <!-- svelte-ignore a11y-click-events-have-key-events -->
                            <!-- svelte-ignore a11y-no-static-element-interactions -->
                            <div
                              class="flex items-center gap-1"
                              on:click={() => unmanage(peerId, category)}
                            >
                              <label for={peerId} class="font-semibold text-sm text-neutral-300"
                                >{category}</label
                              >

                              <Toggle
                                on:click={() => unmanage(peerId, category)}
                                bind:toggled={managed[peerId][category]}
                              />
                            </div>
                          {/each}
                        </div>
                      </td>
                    {/if}
                  </tr>
                {/each}
              {/if}
            </tbody>
          </table>
        </div>
      </div>
    {:else}
      <!-- START CLBOSS -->
      <div class="mt-4 w-min"><Button text="Start CLBOSS" on:click={startClboss} /></div>
    {/if}
  </Section>
{/if}

<!-- // @TODO
// Fix mobile styles
// Add tooltips 
// Render lnfee as "fees" in the toggle list
// english/spanish support
-->

<!-- // let preferences = {
  //   send: false,
  //   receive: false,
  //   both: true
  // } -->

<!-- <h1 class="text-lg mt-4">Optimize node to:</h1>
  <div class="mt-4 flex flex-col gap-4">
    <div class="flex gap-1" on:click={() => setPreference('send')}>
      <div class="pointer-events-none">
        <Toggle bind:toggled={preferences.send}>
          <div slot="right" class="ml-2">Mostly Send Payments</div>
        </Toggle>
      </div>
      <Tooltip text="Mostly Send description" />
    </div>
    <div class="flex gap-1" on:click={() => setPreference('both')}>
      <div class="pointer-events-none">
        <Toggle bind:toggled={preferences.both}>
          <div slot="right" class="ml-2">Equally Send & Receive Payments</div>
        </Toggle>
      </div>
      <Tooltip text="Equally Send & Receive description" />
    </div>
    <div class="flex gap-1" on:click={() => setPreference('receive')}>
      <div class="pointer-events-none">
        <Toggle bind:toggled={preferences.receive}>
          <div slot="right" class="ml-2">Mostly Receive Payments</div>
        </Toggle>
      </div>
      <Tooltip text="Mostly Receive description" />
    </div>
  </div> -->

<!-- let minOnchain: number | null = null
  let minChannelSize: number | null = null
  let maxChannelSize: number | null = null -->

<!-- <h1 class="mt-8 text-lg text-center">CONFIGURATION</h1>
     <h1 class="text-lg mt-4">Optimize node to:</h1>
    <div class="mt-4 flex flex-col gap-4">
      <div class="flex gap-1" on:click={() => setPreference('send')}>
        <div class="pointer-events-none">
          <Toggle bind:toggled={preferences.send}>
            <div slot="right" class="ml-2">Mostly Send Payments</div>
          </Toggle>
        </div>
        <Tooltip text="Mostly Send description" />
      </div>
      <div class="flex gap-1" on:click={() => setPreference('both')}>
        <div class="pointer-events-none">
          <Toggle bind:toggled={preferences.both}>
            <div slot="right" class="ml-2">Equally Send & Receive Payments</div>
          </Toggle>
        </div>
        <Tooltip text="Equally Send & Receive description" />
      </div>
      <div class="flex gap-1" on:click={() => setPreference('receive')}>
        <div class="pointer-events-none">
          <Toggle bind:toggled={preferences.receive}>
            <div slot="right" class="ml-2">Mostly Receive Payments</div>
          </Toggle>
        </div>
        <Tooltip text="Mostly Receive description" />
      </div>
    </div> -->
