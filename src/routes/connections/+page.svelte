<script lang="ts">
  import { db } from '$lib/db.js'
  import Button from '$lib/components/Button.svelte'
  import Connection from '$lib/components/Connection.svelte'
  import Paragraph from '$lib/components/Paragraph.svelte'
  import Section from '$lib/components/Section.svelte'
  import SectionHeading from '$lib/components/SectionHeading.svelte'
  import Spinner from '$lib/components/Spinner.svelte'
  import { translate } from '$lib/i18n/translations.js'
  import keys from '$lib/icons/keys.js'
  import plus from '$lib/icons/plus.js'
  import { liveQuery } from 'dexie'

  const translateBase = 'app.routes./connections'

  const storedConnections$ = liveQuery(() => db.connections.toArray())
</script>

<Section>
  <div class="h-full flex flex-col overflow-hidden">
    <SectionHeading icon={keys} />

    <!-- NO CONNECTIONS YET -->
    {#if !$storedConnections$}
      <Spinner />
    {:else if !$storedConnections$.length}
      <Paragraph>
        {@html $translate(`${translateBase}.introduction`)}
      </Paragraph>
    {:else}
      <div class="flex flex-wrap gap-2 w-full flex-grow overflow-auto mt-4">
        {#each $storedConnections$ as connection}
          <a href={`/connections/${connection.id}`} class="no-underline">
            <Connection data={connection} />
          </a>
        {/each}
      </div>
    {/if}

    <div class="flex w-full justify-end">
      <a href="/connections/add" class="mt-6 no-underline block w-min">
        <Button primary text={$translate(`${translateBase}.add_connection`)}
          ><div class="w-6 mr-1 -ml-2" slot="iconLeft">{@html plus}</div></Button
        >
      </a>
    </div>
  </div>
</Section>
