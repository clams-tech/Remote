<script lang="ts">
  import Button from '$lib/elements/Button.svelte'
  import Paragraph from '$lib/elements/Paragraph.svelte'
  import Section from '$lib/elements/Section.svelte'
  import SectionHeading from '$lib/elements/SectionHeading.svelte'
  import { translate } from '$lib/i18n/translations.js'
  import keys from '$lib/icons/keys.js'
  import { connectionsInfo$ } from '$lib/streams.js'

  const translateBase = 'app.routes./connections'

  /**
   * 1. Screen for when no connections at all
   *    - Needs to have a brief explanation of what a connection is
   *    - Links to to the "new connection" page to get started
   * 2. Screen listing current connections and a button to add a new connection
   *    - Each connection needs to display all of the necessary info
   *    - Need to be able to update info (switch rune, connection details etc)
   *    - Need to see current connection status
   *    - Need to be able to refresh data for a connection
   *    - Need to be able to manage connection (disconnect, connect)
   */
</script>

<Section>
  <SectionHeading icon={keys} />

  <!-- NO CONNECTIONS YET -->
  {#if !$connectionsInfo$.length}
    <Paragraph>
      {@html $translate(`${translateBase}.introduction`)}
    </Paragraph>

    <a href="/connections/add" class="mt-6 no-underline">
      <Button text={$translate(`${translateBase}.add_connection`)} />
    </a>
  {:else}
    <!-- @TODO - Render current connections -->
  {/if}
</Section>
