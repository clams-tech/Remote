<script lang="ts">
  import type { ConnectionInfo } from '$lib/@types/connections.js'
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
  import { onDestroy$ } from '$lib/streams.js'

  export let data: PageData

  let { info, connection } = data

  let status: ConnectionStatus

  $: if (connection) {
    connection.connectionStatus$.pipe(takeUntil(onDestroy$)).subscribe((newStatus) => {
      status = newStatus
    })
  }

  const typeToComponent = (type: ConnectionInfo['type']): ComponentType => {
    switch (type) {
      case 'coreln':
        return CoreLn
      default:
        throw new Error(`No component for connection type: ${type}`)
    }
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
  <title>{$translate(`app.routes./connections/${info?.type}.title`)}</title>
</svelte:head>

<Section>
  {#if info}
    <SectionHeading bind:text={info.label} icon={keys} editable />

    <!-- @TODO -->
    <!-- render the current status -->
    <!-- render a button that says "connect" or "check connection if not status or status is disconnected" -->

    <!-- render latest transaction or invoice that was done on this connection -->
    <!-- if connected, then render any info for the connection (version, alias, shortened id) -->

    <svelte:component this={typeToComponent(info.type)} bind:configuration={info.configuration} />
  {/if}
</Section>
