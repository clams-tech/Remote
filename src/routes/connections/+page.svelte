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
    <div
      class="grid justify-center 2xl:max-w-2xl grid-cols-2 sm:grid-cols-3 gap-2 w-full max-w-xl overflow-auto mt-6"
    >
      {#each $storedConnections$ as { label, id, type }}
        {@const connectionTypeDetails = connectionOptions.find((c) => c.type === type)}
        <a
          href={`/connections/${id}`}
          class="aspect-square no-underline border p-4 border-neutral-600 rounded flex flex-col justify-center items-center hover:bg-neutral-800/90 bg-neutral-900 transition-all"
        >
          {#if connectionTypeDetails}
            <div class="w-full">{@html connectionTypeDetails.icon}</div>
          {/if}
          <span class="font-semibold border rounded px-4 py-1 truncate w-full text-center"
            >{label}</span
          >
        </a>
      {/each}
    </div>

    <a href="/connections/add" class="mt-6 no-underline block">
      <Button primary text={$translate(`${translateBase}.add_connection`)}
        ><div class="w-6 ml-1" slot="iconRight">{@html plus}</div></Button
      >
    </a>
  {/if}
</Section>
