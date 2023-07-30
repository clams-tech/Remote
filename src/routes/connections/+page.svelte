<script lang="ts">
  import { connectionOptions } from '$lib/connections/index.js'
  import Button from '$lib/elements/Button.svelte'
  import Paragraph from '$lib/elements/Paragraph.svelte'
  import Section from '$lib/elements/Section.svelte'
  import SectionHeading from '$lib/elements/SectionHeading.svelte'
  import { translate } from '$lib/i18n/translations.js'
  import keys from '$lib/icons/keys.js'
  import plus from '$lib/icons/plus.js'
  import { storedConnections$ } from '$lib/streams.js'

  const translateBase = 'app.routes./connections'
</script>

<Section>
  <div class="h-full flex flex-col overflow-hidden">
    <SectionHeading icon={keys} />

    <!-- NO CONNECTIONS YET -->
    {#if !$storedConnections$.length}
      <Paragraph>
        {@html $translate(`${translateBase}.introduction`)}
      </Paragraph>

      <a href="/connections/add" class="mt-6 no-underline block">
        <Button text={$translate(`${translateBase}.add_connection`)}>
          <div class="w-6 ml-1" slot="iconRight">{@html plus}</div>
        </Button>
      </a>
    {:else}
      <div class="flex flex-col gap-2 w-full flex-grow overflow-auto max-w-xl mt-4">
        {#each $storedConnections$ as { label, id, type }}
          {@const connectionTypeDetails = connectionOptions.find((c) => c.type === type)}
          <a
            href={`/connections/${id}`}
            class="no-underline border border-neutral-600 rounded w-full flex justify-between items-center hover:bg-neutral-800/90 bg-neutral-900 transition-all"
          >
            <span class="font-semibold text-lg px-4 py-1 truncate">{label}</span>
            {#if connectionTypeDetails}
              <div class="w-32">{@html connectionTypeDetails.icon}</div>
            {/if}
          </a>
        {/each}
      </div>

      <a href="/connections/add" class="mt-6 no-underline block">
        <Button primary text={$translate(`${translateBase}.add_connection`)}
          ><div class="w-6 ml-1" slot="iconRight">{@html plus}</div></Button
        >
      </a>
    {/if}
  </div>
</Section>
