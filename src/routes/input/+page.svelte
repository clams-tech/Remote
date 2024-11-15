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
  import {
    decodeLightningAddress,
    fetchBitcoinTxtRecord,
    isBolt12Offer,
    parseInput
  } from '$lib/input-parser.js'
  import type { PageData } from './$types.js'

  type InputKey = 'scan' | 'paste' | 'import' | 'nfc'

  export let data: PageData

  let input: InputKey = 'scan'

  const inputs: InputKey[] = [
    'scan',
    'paste',
    'import',
    ...(nfc.available() ? ['nfc' as InputKey] : [])
  ]

  const handleInput = async ({ type, value, amount, label, message, lightning }: ParsedInput) => {
    if (type === 'lightning_address' || type === 'lnurl') {
      const decodedAddress = decodeLightningAddress(value)
      if (decodedAddress) {
        const { username, domain } = decodedAddress
        const bitcoinTxtRecord = await fetchBitcoinTxtRecord(username, domain)

        if (bitcoinTxtRecord) {
          const { type: recordType, value: recordValue } = bitcoinTxtRecord

          if (recordType && recordValue && isBolt12Offer(recordValue)) {
            await goto(`/offers/offer/${recordValue}`)
          } else {
            await goto(`/lnurl/${value}?type=${type}`) // default to lnurl route if value is not valid BOLT12
          }
        } else {
          await goto(`/lnurl/${value}?type=${type}`) // default to lnurl route if no txt records found
        }
      }
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

<svelte:head>
  <title>{$translate(`app.routes./input.title`)}</title>
</svelte:head>

<Section>
  <SectionHeading icon={scan} />

  <div class="mt-4">
    <div
      class="flex items-center text-xs font-semibold rounded-t-lg border-t-2 border-x-2 border-neutral-400 overflow-hidden"
    >
      {#each inputs as key}
        <button
          on:click={() => (input = key)}
          class="p-3 w-full text-center"
          class:text-neutral-900={input === key}
          class:bg-neutral-50={input === key}
        >
          {$translate(`app.labels.${key}`)}
        </button>
      {/each}
    </div>

    <div
      class="border-2 bg-neutral-900 border-neutral-400 rounded-b-lg shadow-md w-full overflow-hidden"
    >
      {#if input === 'scan'}
        <div class="w-full flex items-center">
          <Scan on:input={e => handleInput(e.detail)} />
        </div>
      {:else if input === 'paste'}
        <Text on:input={e => handleInput(e.detail)} />
      {:else if input === 'import'}
        <Image on:input={e => handleInput(e.detail)} />
      {:else if input === 'nfc'}
        <NFCComponent on:input={e => handleInput(e.detail)} />
      {/if}
    </div>
  </div>
</Section>
