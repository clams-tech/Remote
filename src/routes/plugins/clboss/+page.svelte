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

  export let data: PageData
  let loading = true
  let clbossActive = false
  let clbossStatus: ClbossStatus | null = null
  let baseFee = {
    required: false,
    allow: false,
    disallow: false,
    default: false
  }
  let showStatusModal = false
  let ignoreOnchainHours = 24
  let ignoringOnchainFunds = false

  const { wallet } = data

  const activeChannel$ = from(
    liveQuery(() =>
      db.channels.toArray().then(channels => {
        return channels?.filter(({ status }) => status === 'active')
      })
    )
  )

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

  function setBaseFee(value: 'required' | 'allow' | 'disallow' | 'default') {
    baseFee = {
      required: value === 'required',
      allow: value === 'allow',
      disallow: value === 'disallow',
      default: value === 'default'
    }
  }

  let minOnchain: number | null = null
  let minChannelSize: number | null = null
  let maxChannelSize: number | null = null

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

  const testNodeId = '025ecfe2969d73efdd874f878bf80b13700954a063eeb309acb1c51c742205b3b1'
  const testTags = 'lnfee'

  function unmanage(nodeId: string, tags: string) {
    connection.clboss?.unmanage(nodeId, tags).then(response => {
      console.log(
        `response = `,
        connection.clboss?.noticeOnchain().then(response => {
          getStatus()
        })
      )
      getStatus()
    })
  }

  // @TODO
  // list all of the channels for the UNMANAGE ui, each channel should have 4 tags that can be passed to CLBOSS as "unmanage" areas.
  // and include the option to unmanage everything for the channel

  // Finish the status modal - https://github.com/ZmnSCPxj/clboss?tab=readme-ov-file#clboss-status
  // Fix tooltip descriptions so they dont spread over screen
  // Add button to activate CLBOSS if it not currently active
  // Add logic to update advanced configs and restart node to test changes

  activeChannel$.subscribe(val => console.log(`val = `, val))

  const channelManageCategories = ['lnfee', 'open', 'close', 'balance']
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
      Nevertheless, CLBOSS exposes a few commands and configuration options as well. Please be
      mindful that updating the configuration options requires a restart of your node.
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
        <div class="w-min">
          <Button text="Test Unmanage" on:click={() => unmanage(testNodeId, testTags)} />
        </div>
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
            {#if $activeChannel$.length}
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
                      {#each channelManageCategories as cat}
                        <div class="flex items-center gap-1">
                          <label for={peerId} class="font-semibold text-sm text-neutral-300"
                            >{cat}</label
                          >
                          <input
                            type="checkbox"
                            id={peerId}
                            name={peerId}
                            class="checked:bg-purple-400 hover:checked:bg-purple-500 rounded-md"
                          />
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

    <h1 class="mt-8 text-lg text-center">CONFIGURATION</h1>
    <div class="mt-4">
      <div class="flex flex-col gap-4">
        <TextInput
          name="minOnchain"
          type="number"
          label="Minimum Onchain (sats)"
          placeholder="Min onchain balance CLBOSS will maintain"
          bind:value={minOnchain}
        />
        <TextInput
          name="minChannelSize"
          type="number"
          label="Minimum Channel Size (sats)"
          placeholder="Min channel size CLBOSS will open"
          bind:value={minChannelSize}
        />
        <TextInput
          name="maxChannelSize"
          type="number"
          label="Maximum Channel Size (sats)"
          placeholder="Max channel size CLBOSS will open"
          bind:value={maxChannelSize}
        />
      </div>
    </div>
    <div class="mt-4 flex items-center gap-4">
      <h2>
        Auto Close <Tooltip
          text="Enable if you want CLBOSS to have the ability to close channels it deems unprofitable. This can be costly, please understand the ramifications before enabling. Default: False"
        />
      </h2>
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div class="flex items-center gap-1" on:click={() => setBaseFee('required')}>
        <div class="pointer-events-none">
          <Toggle bind:toggled={baseFee.required}>
            <div slot="right" class="ml-1" />
          </Toggle>
        </div>
      </div>
    </div>
    <div class="mt-4 flex items-center gap-4">
      <h2>
        Zero Base Fee <Tooltip
          text="Specify how this node will advertise its base fee.
Required: The base fee must be always 0.
Allow: If the heuristics of CLBOSS think it might be a good idea to set base fee to 0, let it be 0, but otherwise set it to whatever value the heuristics want.
Disallow: The base fee must always be non-zero. If the heuristics think it might be good to set it to 0, set it to 1 instead.
Default: default (use fee set by Advanced -> Routing Base Fee)
Some pathfinding algorithms under development may strongly prefer 0 or low base fees, so you might want to set CLBOSS to 0 base fee, or to allow a 0 base fee.
"
        />
      </h2>
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div class="flex items-center gap-1" on:click={() => setBaseFee('required')}>
        <div class="pointer-events-none">
          <Toggle bind:toggled={baseFee.required}>
            <div slot="right" class="ml-1 text-sm">Required</div>
          </Toggle>
        </div>
      </div>
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div class="flex items-center gap-1" on:click={() => setBaseFee('allow')}>
        <div class="pointer-events-none">
          <Toggle bind:toggled={baseFee.allow}>
            <div slot="right" class="ml-1 text-sm">Allow</div>
          </Toggle>
        </div>
      </div>
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div class="flex items-center gap-1" on:click={() => setBaseFee('disallow')}>
        <div class="pointer-events-none">
          <Toggle bind:toggled={baseFee.disallow}>
            <div slot="right" class="ml-1 text-sm">Disallow</div>
          </Toggle>
        </div>
      </div>
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div class="flex items-center gap-1" on:click={() => setBaseFee('default')}>
        <div class="pointer-events-none">
          <Toggle bind:toggled={baseFee.default}>
            <div slot="right" class="ml-1 text-sm">Default</div>
          </Toggle>
        </div>
      </div>
    </div>
    <div class="mt-8 w-min">
      <Button text="Save" />
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

<!-- 
    // function setPreference(value: 'send' | 'receive' | 'both') {
      //   preferences = {
      //     send: value === 'send',
      //     receive: value === 'receive',
      //     both: value === 'both'
      //   }
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
