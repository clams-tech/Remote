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
  import CoreLn from './coreln/Index.svelte'

  export let data: PageData

  const { info, connection } = data

  let editingLabel = false

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

<Section>
  {#if info}
    <SectionHeading bind:text={info.label} icon={keys} editable />

    <svelte:component this={typeToComponent(info.type)} bind:configuration={info.configuration} />
  {/if}
</Section>
