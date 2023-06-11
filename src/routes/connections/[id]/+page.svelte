<script lang="ts">
  import type { ConnectionConfiguration, ConnectionInfo } from '$lib/@types/connections.js'
  import Button from '$lib/elements/Button.svelte'
  import Paragraph from '$lib/elements/Paragraph.svelte'
  import Section from '$lib/elements/Section.svelte'
  import SectionHeading from '$lib/elements/SectionHeading.svelte'
  import { translate } from '$lib/i18n/translations.js'
  import keys from '$lib/icons/keys.js'
  import type { ComponentType } from 'svelte'
  import type { PageData } from './$types'
  import CoreLn from '$lib/connections/configurations/coreln/Index.svelte'
  import type { ConnectionStatus } from 'lnmessage/dist/types.js'
  import { takeUntil } from 'rxjs'
  import { onDestroy$, session$ } from '$lib/streams.js'
  import { connectionInfoToInterface } from '$lib/connections/index.js'
  import { slide } from 'svelte/transition'
  import settingsOutline from '$lib/icons/settings-outline.js'
  import caret from '$lib/icons/caret.js'
  import { liveQuery } from 'dexie'
  import { db } from '$lib/db.js'
  import { DOCS_LINK } from '$lib/constants.js'
  import info from '$lib/icons/info.js'

  export let data: PageData

  let { id, connection } = data
  let status: ConnectionStatus
  let showConfiguration = false

  /**if we have not already instantiated a connection
   * show the configuration options automatically
   */
  if (!connection) {
    showConfiguration = true
  }

  const connectionInfo$ = liveQuery(() => db.connections.get(id))

  $: if (connection) {
    connection.connectionStatus$.pipe(takeUntil(onDestroy$)).subscribe((newStatus) => {
      status = newStatus
    })
  }

  const typeToConfigurationComponent = (type: ConnectionInfo['type']): ComponentType => {
    switch (type) {
      case 'coreln':
        return CoreLn
      default:
        throw new Error(`No component for connection type: ${type}`)
    }
  }

  const connect = async () => {
    connection = connectionInfoToInterface($connectionInfo$!, $session$!)
    connection.connect && connection.connect()
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
  <title>{$translate(`app.routes./connections/${$connectionInfo$?.type}.title`)}</title>
</svelte:head>

<Section>
  {#if $connectionInfo$}
    {@const { label, type, configuration } = $connectionInfo$}

    <div class="flex items-center justify-between">
      <SectionHeading
        on:updated={({ detail }) => handleLabelUpdate(detail)}
        text={label}
        icon={keys}
        editable
      />

      <div class="flex items-center">
        {#if configuration}
          <button
            on:click={() => (showConfiguration = !showConfiguration)}
            class="flex items-center"
          >
            <div class="w-4 transition-all flex-shrink-0" class:rotate-90={!showConfiguration}>
              {@html caret}
            </div>
            <div class="w-8 flex-shrink-0">
              {@html settingsOutline}
            </div>
          </button>
        {/if}

        <!-- @TODO - Ensure docs links are up for connections help -->
        <a href={`${DOCS_LINK}/connections/coreln`} target="_blank" rel="noopener noreferrer">
          <div class="ml-1 w-8 flex-shrink-0">
            {@html info}
          </div>
        </a>
      </div>
    </div>

    <!-- @TODO -->
    <!-- render the current status -->
    <!-- render a button that says "connect" or "check connection if not status or status is disconnected" -->

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
  {/if}
</Section>
