<script lang="ts">
  import Calculator from '$lib/components/Calculator.svelte'
  import type { Connection } from '$lib/connections/interfaces.js'
  import { db } from '$lib/db.js'
  import Button from '$lib/elements/Button.svelte'
  import Section from '$lib/elements/Section.svelte'
  import SectionHeading from '$lib/elements/SectionHeading.svelte'
  import TextInput from '$lib/elements/TextInput.svelte'
  import { translate } from '$lib/i18n/translations.js'
  import lightningOutline from '$lib/icons/lightning-outline.js'
  import receive from '$lib/icons/receive.js'
  import { storedConnections$ } from '$lib/streams.js'
  import Big from 'big.js'

  let selectedConnection: Connection['id']
  let amount = 0

  const getLastPaymentConnection = async () => {
    const [] = await Promise.all([
      db.invoices.orderBy('completedAt').reverse().limit(1),
      db.utxos.orderBy('completedAt').reverse().limit(1)
    ])
  }

  const createPayment = () => {
    //
  }
</script>

<Section>
  <div class="flex items-center justify-between">
    <SectionHeading icon={receive} />
    <div class="w-12">
      <Calculator on:amount={({ detail }) => (amount = detail)} />
    </div>
  </div>

  <div class="mb-5 mt-1">
    <div class="text-sm w-1/2 text-inherit text-neutral-300 mb-2 font-semibold">
      {$translate('app.labels.connection')}
    </div>

    <div
      class="flex w-full flex-wrap gap-2 rounded font-medium px-4 py-2 border border-neutral-600 bg-neutral-900"
    >
      {#each $storedConnections$ as { label, id }}
        <button
          class:border-purple-500={selectedConnection === id}
          class="border rounded-full px-3 py-1"
          on:click={() => (selectedConnection = id)}>{label}</button
        >
      {/each}
    </div>
  </div>

  <TextInput
    type="number"
    bind:value={amount}
    label={$translate('app.labels.sats')}
    name="amount"
    hint={!amount ? 'Any amount' : ''}
    msat={amount ? Big(amount).times(1000).toString() : ''}
  />

  <div class="mt-6">
    <Button on:click={createPayment} text="Create payment" primary>
      <div class="w-6 ml-1" slot="iconRight">{@html lightningOutline}</div>
    </Button>
  </div>
</Section>
