<script lang="ts">
  import { goto } from '$app/navigation'
  import type { ConnectionDetails } from '$lib/@types/connections.js'
  import { db } from '$lib/db.js'
  import Paragraph from '$lib/elements/Paragraph.svelte'
  import Section from '$lib/elements/Section.svelte'
  import SectionHeading from '$lib/elements/SectionHeading.svelte'
  import { translate } from '$lib/i18n/translations.js'
  import keys from '$lib/icons/keys.js'
  import { createRandomHex, nowSeconds } from '$lib/utils.js'

  import {
    connectionOptions,
    connectionTypeToInitialConfiguration
  } from '$lib/connections/index.js'

  const translateBase = 'app.routes./connections/add'

  const addConnection = async (type: ConnectionDetails['type']) => {
    // add new connection to the db with generic label and random id
    const id = createRandomHex()
    const label = 'New Coreln'

    await db.connections.add({
      id,
      label,
      type,
      createdAt: nowSeconds(),
      modifiedAt: null,
      configuration: connectionTypeToInitialConfiguration(type),
      lastSync: null,
      syncing: false
    })

    // route to the created connection id
    await goto(`/connections/${id}`)
  }
</script>

<Section>
  <SectionHeading icon={keys} />
  <Paragraph>{$translate(`${translateBase}.introduction`)}</Paragraph>

  <div
    class="grid justify-center 2xl:max-w-2xl grid-cols-2 sm:grid-cols-3 gap-2 w-full max-w-xl overflow-auto mt-6"
  >
    {#each connectionOptions as { icon, type }}
      <button
        on:click={() => addConnection(type)}
        class="aspect-square no-underline border border-neutral-600 rounded flex flex-col justify-center items-center hover:bg-neutral-800/90 bg-neutral-900 transition-all"
      >
        <div class="w-full">
          {@html icon}
        </div>
      </button>
    {/each}
  </div>
</Section>
