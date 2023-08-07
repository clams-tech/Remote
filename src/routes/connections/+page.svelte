<script lang="ts">
  import { connectionOptions } from '$lib/connections/index.js'
  import { db } from '$lib/db.js'
  import Button from '$lib/elements/Button.svelte'
  import Paragraph from '$lib/elements/Paragraph.svelte'
  import Section from '$lib/elements/Section.svelte'
  import SectionHeading from '$lib/elements/SectionHeading.svelte'
  import Spinner from '$lib/elements/Spinner.svelte'
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
        {#each $storedConnections$ as { label, id, type }}
          {@const connectionTypeDetails = connectionOptions.find((c) => c.type === type)}
          <a
            href={`/connections/${id}`}
            class="no-underline border border-neutral-600 rounded w-min flex justify-between items-center hover:bg-neutral-800/90 bg-neutral-900 transition-all"
          >
            <span class="font-semibold text-lg px-4 py-1 truncate">{label}</span>
            {#if connectionTypeDetails}
              <div class="w-32">{@html connectionTypeDetails.icon}</div>
            {/if}
          </a>
        {/each}
      </div>
    {/if}

    <div class="flex w-full justify-end">
      <a href="/connections/add" class="mt-6 no-underline block w-min">
        <Button primary text={$translate(`${translateBase}.add_connection`)}
          ><div class="w-6 ml-1 -mr-2" slot="iconRight">{@html plus}</div></Button
        >
      </a>
    </div>
  </div>
</Section>
