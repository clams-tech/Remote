<script lang="ts">
  import type { ParsedInput } from '$lib/@types/common.js'
  import Section from '$lib/elements/Section.svelte'
  import SectionHeading from '$lib/elements/SectionHeading.svelte'
  import { translate } from '$lib/i18n/translations.js'
  import scan from '$lib/icons/scan.js'
  import Image from './components/Image.svelte'
  import Scan from './components/Scan.svelte'
  import Text from './components/Text.svelte'
  import NFCComponent from './components/Nfc.svelte'
  import { nfc } from '$lib/services.js'
  import { goto } from '$app/navigation'

  type InputKey = 'scan' | 'text' | 'image' | 'nfc'

  let input: InputKey = 'scan'

  const inputs: InputKey[] = [
    'scan',
    'text',
    'image',
    ...(nfc.available() ? ['nfc' as InputKey] : [])
  ]

  const handleInput = async ({ type, value, amount, label, message, lightning }: ParsedInput) => {
    if (type === 'lightning_address' || type === 'lnurl') {
      await goto(`/lnurl/${value}?type=${type}`)
    } else if (type === 'node_address') {
      await goto(`/channels/open?address=${value}`)
    } else if (type === 'offer') {
      await goto(`/offers/bolt12/${value}`)
    } else if (type === 'invoice' || type === 'node_publickey' || type === 'onchain') {
      await goto(
        `/send/${value}?amount=${amount}&label=${label}&message=${message}&lightning=${lightning}`
      )
    }
  }
</script>

<Section>
  <SectionHeading icon={scan} />

  <div class="mt-4">
    <div
      class="flex items-center text-xs font-semibold rounded-t-lg border-t-2 border-x-2 border-neutral-400 overflow-hidden w-min"
    >
      {#each inputs as key}
        <button
          on:click={() => (input = key)}
          class="px-3 py-1 block"
          class:text-neutral-900={input === key}
          class:bg-neutral-50={input === key}
        >
          {$translate(`app.labels.${key}`)}
        </button>
      {/each}
    </div>

    <div
      class="border-2 bg-neutral-900 border-neutral-400 rounded-b-lg rounded-tr-lg shadow-md w-full overflow-hidden"
    >
      {#if input === 'scan'}
        <div class="w-full flex items-center">
          <Scan on:input={(e) => handleInput(e.detail)} />
        </div>
      {:else if input === 'text'}
        <Text on:input={(e) => handleInput(e.detail)} />
      {:else if input === 'image'}
        <Image on:input={(e) => handleInput(e.detail)} />
      {:else if input === 'nfc'}
        <NFCComponent on:input={(e) => handleInput(e.detail)} />
      {/if}
    </div>
  </div>
</Section>
