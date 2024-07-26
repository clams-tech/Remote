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
  import { connections$ } from '$lib/streams'
  import type { Connection } from '$lib/wallets/interfaces'
  import type { PageData } from './$types'
  import Modal from '$lib/components/Modal.svelte'
  import SummaryRow from '$lib/components/SummaryRow.svelte'
  import { truncateValue } from '$lib/utils'
  import link from '$lib/icons/link.js'
  import { fade } from 'svelte/transition'
  import CopyValue from '$lib/components/CopyValue.svelte'
  import { formatDate } from '$lib/dates'
  import { from } from 'rxjs'
  import { liveQuery } from 'dexie'
  import { db } from '$lib/db/index.js'
  import type { Channel } from './@types/channels.js'

  export let data: PageData
  let loading = true
  let clbossActive = false
  let clbossStatus: ClbossStatus | null = null
  let showStatusModal = false
  let ignoreOnchainHours = 24
  let ignoringOnchainFunds = false
  enum channelManageCategories {
    LNFEE = 'lnfee',
    OPEN = 'open',
    CLOSE = 'close',
    BALANCE = 'balance'
  }
  let managed: {
    // nodeId
    [key: string]: {
      [key in channelManageCategories]: boolean
    }
  } = {}

  const { wallet } = data

  const activeChannel$ = from(
    liveQuery(() =>
      db.channels.toArray().then(channels => {
        return channels?.filter(({ status }) => status === 'active')
      })
    )
  )
  let activeChannels: Channel[] = []
  activeChannel$.subscribe(val => (activeChannels = val))

  $: connection = connections$.value.find(({ walletId }) => walletId === wallet) as Connection

  $: {
    if (connection) {
      connection.plugins?.get().then(plugins => {
        const clbossPlugin = plugins.find(plugin => plugin.name.includes('clboss'))

        clbossActive = clbossPlugin ? clbossPlugin.active : false
        loading = false
      })
    }
  }

  $: clbossStatus?.should_monitor_onchain_funds?.status === 'ignore'
    ? (ignoringOnchainFunds = true)
    : (ignoringOnchainFunds = false)

  // @TODO handle error state
  function getStatus() {
    connection.clboss?.getStatus().then(response => {
      clbossStatus = response
      console.log(`clbossStatus = `, clbossStatus)
    })
  }

  // @TODO handle error state
  function ignoreOnchain() {
    console.log(`ignoreOnchainHours = `, ignoreOnchainHours)
    connection.clboss?.ignoreOnchain(ignoreOnchainHours).then(response => {
      getStatus()
    })
  }

  // @TODO handle error state
  function noticeOnchain() {
    connection.clboss?.noticeOnchain().then(response => {
      getStatus()
    })
  }

  function unmanage(nodeId: string, tags: string) {
    connection.clboss?.unmanage(nodeId, tags).then(response => {
      console.log(`response = `, response)
      getStatus()
    })
  }

  $: activeChannels.length &&
    clbossStatus?.unmanaged &&
    updateManagedChannels(activeChannels, clbossStatus?.unmanaged)

  function updateManagedChannels(
    activeChannels: Channel[],
    statusUnmanaged: ClbossStatus['unmanaged']
  ) {
    activeChannels.forEach(activeChannel => {
      const { peerId } = activeChannel

      const unmanagedCategories: string | undefined = statusUnmanaged[peerId]

      // CLBOSS has not received any "unmanage" requests for this channel
      if (!unmanagedCategories) {
        managed[peerId] = {
          [channelManageCategories.LNFEE]: true,
          [channelManageCategories.OPEN]: true,
          [channelManageCategories.CLOSE]: true,
          [channelManageCategories.BALANCE]: true
        }
        // CLBOSS has received at least one "unmanage" requests for this channel
      } else {
        managed[peerId] = {
          [channelManageCategories.LNFEE]: Boolean(unmanagedCategories.includes('lnfee')),
          [channelManageCategories.OPEN]: Boolean(unmanagedCategories.includes('open')),
          [channelManageCategories.CLOSE]: Boolean(unmanagedCategories.includes('close')),
          [channelManageCategories.BALANCE]: Boolean(unmanagedCategories.includes('balance'))
        }
      }
    })
  }

  $: console.log(`managed = `, managed)

  // @TODO
  // list all of the channels for the UNMANAGE ui, each channel should have 4 tags that can be passed to CLBOSS as "unmanage" areas.
  // and include the option to unmanage everything for the channel
  // Finish the status modal - https://github.com/ZmnSCPxj/clboss?tab=readme-ov-file#clboss-status
  // Fix tooltip descriptions so they dont spread over screen
  // Add button to activate CLBOSS if it not currently active
  // Add logic to update advanced configs and restart node to test changes
</script>

<Section>
  <div class="flex items-center justify-between gap-x-4">
    <SectionHeading icon={terminal} />
  </div>
  {#if loading}
    <Spinner size="1.5em" />
  {:else if clbossActive}
    <p>
      A goal of CLBOSS is that you never have to monitor or check your node, or CLBOSS, at all.
      Nevertheless, CLBOSS exposes a few commands.
    </p>

    <h1 class="mt-8 text-lg text-center">COMMANDS</h1>
    <div />
    <div class="flex flex-col gap-4">
      <!-- STATUS MODAL -->
      <div>
        {#if showStatusModal}
          <Modal on:close={() => (showStatusModal = false)}>
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
                          <div class="flex justify-between items-center gap-1">
                            <p>{truncateValue(candidate?.id, 4)}</p>
                            <a
                              href={`https://amboss.space/node/${candidate?.id}`}
                              rel="noopener noreferrer"
                              target="_blank"
                            >
                              <div in:fade|local={{ duration: 250 }} class="w-6 cursor-pointer">
                                {@html link}
                              </div></a
                            >
                          </div>
                        </div>
                      {/each}
                    {:else}
                      <p>-</p>
                    {/if}
                  </div>
                {/if}
              </div>
            </SummaryRow>
            <SummaryRow>
              <div slot="label">Internet</div>
              <div slot="value">{clbossStatus?.internet?.connection}</div>
            </SummaryRow>
            <SummaryRow>
              <div slot="label">Onchain Fee Rate</div>
              <div slot="value">
                <p
                  class:text-utility-success={clbossStatus?.onchain_feerate?.judgment ===
                    'low fees'}
                  class:text-utility-error={clbossStatus?.onchain_feerate?.judgment === 'high fees'}
                >
                  {clbossStatus?.onchain_feerate?.judgment || '-'}
                </p>
              </div>
            </SummaryRow>
            <SummaryRow>
              <div slot="label">Peer Metrics</div>
              <div slot="value">
                {#if clbossStatus?.peer_metrics && Object.keys(clbossStatus?.peer_metrics).length}
                  <CopyValue value={JSON.stringify(clbossStatus?.peer_metrics)} hideValue={true} />
                {:else}
                  <p>-</p>
                {/if}
              </div>
            </SummaryRow>
          </Modal>
        {/if}
        <div class="w-min">
          <Button
            text="Get Status"
            on:click={() => {
              getStatus()
              showStatusModal = true
            }}
          />
        </div>
      </div>
      <!-- IGNORE / NOTICE ONCHAIN -->
      <div class="mt-4 flex flex-col gap-4">
        <TextInput
          name="ignoreOnchain"
          type="number"
          label="Ignore onchain funds (hours)"
          placeholder="Number of hours CLBOSS should ignore onchain balance"
          bind:value={ignoreOnchainHours}
        />
        <div class="w-min"><Button text="Update" on:click={ignoreOnchain} /></div>
        {#if ignoringOnchainFunds && clbossStatus?.should_monitor_onchain_funds}
          <p>
            CLBOSS is isnoring onchain funds until
            {#await formatDate(clbossStatus?.should_monitor_onchain_funds.disable_until, 'HH:mm - yyyy-MM-dd') then response}
              {response}
            {/await}
          </p>
          <div class="w-min"><Button text="Disable" on:click={noticeOnchain} /></div>
        {/if}
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
                  <td class="p-2 border border-slate-600">
                    <div class="flex flex-wrap justify-between items-center gap-2">
                      {#each Object.values(channelManageCategories) as cat}
                        <div class="flex items-center gap-1">
                          <label for={peerId} class="font-semibold text-sm text-neutral-300"
                            >{cat}</label
                          >
                          {#if peerId && managed[peerId]}
                            <Toggle toggled={peerId && managed[peerId][cat]} />
                          {/if}
                        </div>
                      {/each}
                    </div>
                  </td>
                </tr>
              {/each}
            {/if}
          </tbody>
        </table>
      </div>
    </div>
  {:else}
    <p>Would you like to activate CLBOSS?</p>
  {/if}
</Section>

<!-- // let preferences = {
  //   send: false,
  //   receive: false,
  //   both: true
  // } -->

<!-- let minOnchain: number | null = null
  let minChannelSize: number | null = null
  let maxChannelSize: number | null = null -->

<!-- 
    // function setPreference(value: 'send' | 'receive' | 'both') {
      //   preferences = {
      //     send: value === 'send',
      //     receive: value === 'receive',
      //     both: value === 'both'
      //   }
      // } -->

<!-- <h1 class="mt-8 text-lg text-center">CONFIGURATION</h1>
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
