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

  export let data: PageData
  let loading = true
  let clbossActive = false
  let clbossStatus: ClbossStatus | null = null
  let preferences = {
    send: false,
    receive: false,
    both: true
  }
  let baseFee = {
    required: false,
    allow: false,
    disallow: false,
    default: false
  }
  let showStatusModal = false

  const { wallet } = data

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

  function setPreference(value: 'send' | 'receive' | 'both') {
    preferences = {
      send: value === 'send',
      receive: value === 'receive',
      both: value === 'both'
    }
  }

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

  function getStatus() {
    connection.clboss?.get().then(response => {
      clbossStatus = response
      console.log(`clbossStatus = `, clbossStatus)
      showStatusModal = true
    })
  }

  // @TODO
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
    <p>
      A goal of CLBOSS is that you never have to monitor or check your node, or CLBOSS, at all.
      Nevertheless, CLBOSS exposes a few commands and configuration options as well. Please be
      mindful that updating the configuration options requires a restart of your node.
    </p>

    <h1 class="mt-8 text-lg text-center">COMMANDS</h1>
    <div>
      {#if showStatusModal}
        <Modal on:close={() => (showStatusModal = false)}>
          <SummaryRow>
            <div slot="label">Channel Candidates</div>
            <div slot="value">
              {#if clbossStatus}
                <div class="max-h-[5em] overflow-scroll scroll-smooth">
                  {#each clbossStatus?.channel_candidates as candidate}
                    <div class="flex items-center">
                      <p>{truncateValue(candidate?.id, 4)}</p>
                      <a
                        href={`https://amboss.space/node/${candidate?.id}`}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        <div in:fade|local={{ duration: 250 }} class="w-6 cursor-pointer ml-1">
                          {@html link}
                        </div></a
                      >
                    </div>
                  {/each}
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
                class:text-utility-success={clbossStatus?.onchain_feerate.judgment === 'low fees'}
                class:text-utility-error={clbossStatus?.onchain_feerate.judgment === 'high fees'}
              >
                {clbossStatus?.onchain_feerate.judgment}
              </p>
            </div>
          </SummaryRow>
          <SummaryRow>
            <div slot="label">Peer Metrics</div>
            <div slot="value">{clbossStatus?.peer_metrics}</div>
          </SummaryRow>
        </Modal>
      {/if}
      <div class="mt-8 w-min">
        <Button text="Get Status" on:click={getStatus} />
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
          value={minOnchain}
        />
        <TextInput
          name="minChannelSize"
          type="number"
          label="Minimum Channel Size (sats)"
          placeholder="Min channel size CLBOSS will open"
          value={minChannelSize}
        />
        <TextInput
          name="maxChannelSize"
          type="number"
          label="Maximum Channel Size (sats)"
          placeholder="Max channel size CLBOSS will open"
          value={maxChannelSize}
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
