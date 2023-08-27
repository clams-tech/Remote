<script lang="ts">
  import { goto } from '$app/navigation'
  import type { Wallet } from '$lib/@types/wallets.js'
  import { db } from '$lib/db.js'
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

<Section>
  <SectionHeading icon={keys} />
  <Paragraph>{$translate(`${translateBase}.introduction`)}</Paragraph>

  <div
    class="grid justify-center 2xl:max-w-2xl grid-cols-2 sm:grid-cols-3 gap-2 w-full max-w-xl overflow-auto mt-6"
  >
    {#each connectionOptions as { icon, type }}
      <button
        on:click={() => addWallet(type)}
        class="aspect-square p-6 no-underline border border-neutral-600 rounded flex flex-col justify-center items-center hover:bg-neutral-800/90 bg-neutral-900 transition-all"
      >
        <div class="w-full">
          {@html icon}
        </div>
      </button>
    {/each}
  </div>
</Section>
