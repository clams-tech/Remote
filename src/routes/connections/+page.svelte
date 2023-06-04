<script lang="ts">
  import Section from '$lib/components/Section.svelte'
  import { connections$ } from '$lib/streams.js'

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
  {#if !$connections$.length}
    <!-- @TODO - Render screen for no connections -->
  {:else}
    <!-- @TODO - Render current connections -->
  {/if}
</Section>
