<script lang="ts">
  import type { Connection } from '$lib/connections/interfaces.js'
  import Section from '$lib/elements/Section.svelte'
  import SectionHeading from '$lib/elements/SectionHeading.svelte'
  import TextInput from '$lib/elements/TextInput.svelte'
  import { translate } from '$lib/i18n/translations.js'
  import { storedConnections$ } from '$lib/streams.js'
  import Big from 'big.js'

  let selectedConnection: Connection['id']
  let amount = 0
</script>

<Section>
  <SectionHeading />

  <div class="mb-4 mt-2">
    <div class="text-sm w-1/2 text-inherit text-neutral-300 mb-1 font-semibold">
      {$translate('app.labels.connection')}
    </div>

    <div
      class="flex w-full flex-wrap gap-2 bg-neutral-900 border border-neutral-600 rounded font-medium px-4 py-[14px]"
    >
      {#each $storedConnections$ as { label, id }}
        <button
          class:border-purple-500={selectedConnection === id}
          class="border rounded-full px-4 py-1"
          on:click={() => (selectedConnection = id)}>{label}</button
        >
      {/each}
    </div>
  </div>

  <TextInput
    type="number"
    bind:value={amount}
    label={`${$translate('app.labels.amount')} (${$translate('app.labels.sats').toLowerCase()})`}
    name="amount"
    hint={!amount ? 'Any amount' : ''}
    msat={amount ? Big(amount).times(1000).toString() : ''}
  />
</Section>
