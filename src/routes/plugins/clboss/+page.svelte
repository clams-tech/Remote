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

  const { wallet } = data

  $: connection = connections$.value.find(({ walletId }) => walletId === wallet) as Connection

  $: {
    if (connection) {
      connection.plugins?.get().then(plugins => {
        const clbossPlugin = plugins.find(plugin => plugin.name.includes('clboss'))

        clbossActive = clbossPlugin ? clbossPlugin.active : false
        loading = false
      })

      connection.clboss?.get().then(response => {
        clbossStatus = response
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

  $: console.log(`clbossStatus = `, clbossStatus)

  // @TODO
  // Add tooltip descriptions
  // Add commands UI
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
      <h2>Auto Close <Tooltip text="Required description" /></h2>
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
      <h2>Zero Base Fee <Tooltip text="Default description" /></h2>
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
