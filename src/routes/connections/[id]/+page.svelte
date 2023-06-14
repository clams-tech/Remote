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
  import { fade, slide } from 'svelte/transition'
  import settingsOutline from '$lib/icons/settings-outline.js'
  import caret from '$lib/icons/caret.js'
  import { liveQuery } from 'dexie'
  import { db } from '$lib/db.js'
  import Msg from '$lib/elements/Msg.svelte'
  import { goto } from '$app/navigation'
  import type { ConnectionInterface } from '$lib/connections/interfaces.js'
  import { nowSeconds } from '$lib/utils.js'
  import refresh from '$lib/icons/refresh.js'
  import CopyValue from '$lib/elements/CopyValue.svelte'
  import SummaryRow from '$lib/elements/SummaryRow.svelte'

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
      connection.connect && (await connection.connect())
      connections$.next([...$connections$, connection])

      // refresh info UI
      connection = connection
    } catch (error) {
      connectionError = (error as Error).message
    }
  }

  const disconnect = () => {
    connection && connection.disconnect && connection.disconnect()
  }

  const handleLabelUpdate = async (label: string) => {
    await db.connections.update(id, { label, modifiedAt: nowSeconds() })
  }

  const handleConfigurationUpdate = async (configuration: ConnectionConfiguration) => {
    await db.connections.update(id, { configuration, modifiedAt: nowSeconds() })
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

    <div class="flex items-center justify-between mt-4">
      <div class="w-min">
        {#if !status || status === 'disconnected'}
          <div in:fade|local={{ duration: 250 }}>
            <Button on:click={connect} primary text={$translate('app.labels.connect')} />
          </div>
        {/if}

        {#if status && status === 'connected'}
          <div class="flex gap-x-2" in:fade|local={{ duration: 250 }}>
            <Button on:click={disconnect} warning text={$translate('app.labels.disconnect')} />
            <Button on:click={connect} primary text={$translate('app.labels.sync')}>
              <div class="w-4 ml-2" slot="iconRight">{@html refresh}</div>
            </Button>
          </div>
        {/if}
      </div>

      <div class="flex items-center py-2">
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

    {#if connection && connection.info}
      {@const { id, alias, version } = connection.info}
      <div transition:slide|local={{ duration: 250 }} class="w-full my-4">
        <SummaryRow>
          <div slot="label">{$translate('app.labels.id')}:</div>
          <div slot="value">
            <CopyValue value={id} truncateLength={9} />
          </div>
        </SummaryRow>

        {#if alias}
          <SummaryRow>
            <div slot="label">{$translate('app.labels.alias')}:</div>
            <div slot="value">
              {alias}
            </div>
          </SummaryRow>
        {/if}

        {#if version}
          <SummaryRow>
            <div slot="label">version:</div>
            <div slot="value">
              {version}
            </div>
          </SummaryRow>
        {/if}
      </div>
    {/if}

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
