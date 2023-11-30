<script lang="ts">
  import { goto } from '$app/navigation'
  import type { Wallet } from '$lib/@types/wallets.js'
  import { db } from '$lib/db/index.js'
  import Paragraph from '$lib/components/Paragraph.svelte'
  import Section from '$lib/components/Section.svelte'
  import SectionHeading from '$lib/components/SectionHeading.svelte'
  import { translate } from '$lib/i18n/translations.js'
  import keys from '$lib/icons/keys.js'
  import { nowSeconds } from '$lib/utils.js'
  import { createRandomHex } from '$lib/crypto.js'
  import { connectionOptions, walletTypeToInitialConfiguration } from '$lib/wallets/index.js'

  const translateBase = 'app.routes./wallets/add'

  const addWallet = async (type: Wallet['type']) => {
    // add new wallet to the db with generic label and random id
    const id = createRandomHex()
    const label = type

    await db.wallets.add({
      id,
      label,
      type,
      createdAt: nowSeconds(),
      modifiedAt: null,
      configuration: walletTypeToInitialConfiguration(type),
      lastSync: null,
      syncing: false
    })

    // route to the created wallet id
    await goto(`/wallets/${id}`)
  }
</script>

<svelte:head>
  <title>{$translate(`app.routes./wallets/add.title`)}</title>
</svelte:head>

<Section>
  <SectionHeading icon={keys} />

  <Paragraph>{$translate(`${translateBase}.introduction`)}</Paragraph>

  <div class="w-full flex flex-col overflow-auto gap-y-4 mt-4 h-full">
    <div>
      {#each Object.entries(connectionOptions) as [category, connections]}
        <div class="font-semibold text-neutral-300 text-sm">
          {$translate(`app.labels.${category}`)}
        </div>

        <div class="mt-2 flex flex-wrap items-center gap-2">
          {#each connections as { icon, type }}
            <button
              on:click={() => addWallet(type)}
              class="border-2 rounded-xl hover:bg-neutral-800 transition-all px-4 py-2"
            >
              <div class="w-32">
                {@html icon}
              </div>
            </button>
          {/each}
        </div>
      {/each}
    </div>
  </div>
</Section>
