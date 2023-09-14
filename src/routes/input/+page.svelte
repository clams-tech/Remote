<script lang="ts">
  import type { ParsedInput } from '$lib/@types/common.js'
  import Section from '$lib/components/Section.svelte'
  import SectionHeading from '$lib/components/SectionHeading.svelte'
  import { translate } from '$lib/i18n/translations.js'
  import scan from '$lib/icons/scan.js'
  import Image from './Image.svelte'
  import Scan from './Scan.svelte'
  import Text from './Text.svelte'
  import NFCComponent from './Nfc.svelte'
  import { nfc } from '$lib/services.js'
  import { goto } from '$app/navigation'
  import { isBolt12Offer, parseInput } from '$lib/input-parser.js'
  import type { PageData } from './$types.js'

  type InputKey = 'scan' | 'text' | 'image' | 'nfc'

  export let data: PageData

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
    } else if (type === 'offer' || (lightning && isBolt12Offer(lightning))) {
      await goto(`/offers/offer/${lightning || value}`)
    } else if (type === 'invoice' || lightning) {
      await goto(`/payments/pay/bolt11/${lightning || value}`)
    } else if (type === 'node_publickey') {
      await goto(`/payments/pay/keysend/${value}`)
    } else if (type === 'onchain') {
      const searchParams = new URLSearchParams()

      if (amount) {
        searchParams.append('amount', amount.toString())
      }

      if (label) {
        searchParams.append('label', label)
      }

      if (message) {
        searchParams.append('message', message)
      }

      await goto(`/payments/pay/onchain/${value}?${searchParams.toString()}`)
    }
  }

  if (data.value) {
    const parsed = parseInput(data.value)

    if (parsed.type !== 'unknown') {
      handleInput(parsed)
    }
  }

  const handleKeyPress = (e: KeyboardEvent) => {
    const currentIndex = inputs.indexOf(input)

    if (e.key === 'ArrowRight') {
      input = inputs[currentIndex + 1] || input
    } else if (e.key === 'ArrowLeft') {
      input = inputs[currentIndex - 1] || input
    }
  }
</script>

<svelte:window on:keyup|stopPropagation={handleKeyPress} />

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
