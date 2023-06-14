<script lang="ts">
  import type { ConnectionConfiguration, ConnectionDetails } from '$lib/@types/connections.js'
  import Button from '$lib/elements/Button.svelte'
  import Section from '$lib/elements/Section.svelte'
  import SectionHeading from '$lib/elements/SectionHeading.svelte'
  import { translate } from '$lib/i18n/translations.js'
  import keys from '$lib/icons/keys.js'
  import type { ComponentType } from 'svelte'
  import type { PageData } from './$types'
  import CoreLn from '$lib/connections/configurations/coreln/Index.svelte'
  import type { ConnectionStatus } from 'lnmessage/dist/types.js'
  import { takeUntil } from 'rxjs'
  import { connections$, onDestroy$, session$ } from '$lib/streams.js'
  import { connectionDetailsToInterface } from '$lib/connections/index.js'
  import { slide } from 'svelte/transition'
  import settingsOutline from '$lib/icons/settings-outline.js'
  import caret from '$lib/icons/caret.js'
  import { liveQuery } from 'dexie'
  import { db } from '$lib/db.js'
  import Msg from '$lib/elements/Msg.svelte'
  import { goto } from '$app/navigation'
  import type { ConnectionInterface } from '$lib/connections/interfaces.js'

  export let data: PageData

  let { id } = data
  let connection: ConnectionInterface | undefined
  let status: ConnectionStatus
  let showConfiguration = false
  let connectionError = ''

  const checkForConnectionDetails = async () => {
    const connectionDetails = (await db.connections.get(id)) as ConnectionDetails

    // no record of this connection, so redirect
    if (!connectionDetails) {
      console.log('DOESNT EXIST, REDIRECTING')
      await goto('/connections')
      return
    }

    connection = connections$.value.find((connection) => connection.info.connectionDetailsId === id)

    /**if we have not modified from original creation
     * show the configuration options automatically as it is a
     * brand new connection
     */
    if (!connectionDetails.modifiedAt) {
      showConfiguration = true
    }
  }

  checkForConnectionDetails()

  const connectionDetails$ = liveQuery(() => db.connections.get(id))

  $: if (connection) {
    connection.connectionStatus$.pipe(takeUntil(onDestroy$)).subscribe((newStatus) => {
      status = newStatus
    })
  }

  const typeToConfigurationComponent = (type: ConnectionDetails['type']): ComponentType => {
    switch (type) {
      case 'coreln':
        return CoreLn
      default:
        throw new Error(`No component for connection type: ${type}`)
    }
  }

  const connect = async () => {
    connectionError = ''

    try {
      connection = connectionDetailsToInterface($connectionDetails$!, $session$!)
      connection.connect && connection.connect()
      connections$.next([...$connections$, connection])
    } catch (error) {
      connectionError = (error as Error).message
    }
  }

  const handleLabelUpdate = async (label: string) => {
    await db.connections.update(id, { label })
  }

  const handleConfigurationUpdate = async (configuration: ConnectionConfiguration) => {
    await db.connections.update(id, { configuration })
  }

  /**
   1. Display the details of the connection
   2. Need to make all details editable
   3. Show connection status
   */

  /**What details do we want to show
   * 1. Connection Status
   * 2. Connection type
   * 3. Configuration (if possible)
   *   3a. Do we update the db as soon as the configuration
   * 4. Delete connection button
   */
</script>

<svelte:head>
  <title>{$translate(`app.routes./connections/${$connectionDetails$?.type}.title`)}</title>
</svelte:head>

<Section>
  {#if $connectionDetails$}
    {@const { label, type, configuration } = $connectionDetails$}

    <div
      class="flex items-center justify-between border-b dark:border-b-neutral-700 border-b-neutral-300"
    >
      <SectionHeading
        on:updated={({ detail }) => handleLabelUpdate(detail)}
        text={label}
        icon={keys}
        editable
      />

      {#if configuration}
        <button
          on:click={() => (showConfiguration = !showConfiguration)}
          class="flex items-center opacity-80"
        >
          <div class="w-4 transition-all flex-shrink-0" class:rotate-180={showConfiguration}>
            {@html caret}
          </div>
          <div class="w-8 flex-shrink-0">
            {@html settingsOutline}
          </div>
        </button>
      {/if}
    </div>

    <div class="my-4 flex items-center justify-between">
      <div class="w-min">
        {#if !status || status === 'disconnected'}
          <Button on:click={connect} primary text={$translate('app.labels.connect')} />
        {/if}
      </div>

      <div class="flex items-center">
        <div class="flex items-center">
          <span
            class="transition-colors"
            class:text-utility-success={status === 'connected'}
            class:text-utility-pending={status === 'connecting' || status === 'waiting_reconnect'}
            class:text-utility-error={!status || status === 'disconnected'}
            >{$translate(`app.labels.${status || 'disconnected'}`)}</span
          >
          <div
            class="w-2 h-2 ml-2 rounded-full transition-colors"
            class:bg-utility-success={status === 'connected'}
            class:bg-utility-pending={status === 'connecting' || status === 'waiting_reconnect'}
            class:bg-utility-error={!status || status === 'disconnected'}
          />
        </div>
      </div>
    </div>

    <!-- render latest transaction or invoice that was done on this connection -->
    <!-- if connected, then render any info for the connection (version, alias, shortened id) -->

    <!-- Connection Configuration UI -->
    {#if showConfiguration}
      <div transition:slide|local={{ duration: 250 }} class="w-full">
        <svelte:component
          this={typeToConfigurationComponent(type)}
          {configuration}
          on:updated={({ detail }) => handleConfigurationUpdate(detail)}
        />
      </div>
    {/if}

    <Msg type="error" bind:message={connectionError} />
  {/if}
</Section>
