<script lang="ts">
  import type { Address } from '$lib/@types/addresses.js'
  import type { Invoice } from '$lib/@types/invoices.js'
  import type { ChainEvent, Transaction } from '$lib/@types/transactions.js'
  import { db } from '$lib/db.js'
  import Msg from '$lib/elements/Msg.svelte'
  import Section from '$lib/elements/Section.svelte'
  import SectionHeading from '$lib/elements/SectionHeading.svelte'
  import Spinner from '$lib/elements/Spinner.svelte'
  import list from '$lib/icons/list.js'
  import { liveQuery } from 'dexie'
  import PaymentRow from './components/PaymentRow.svelte'
  import send from '$lib/icons/send.js'
  import receive from '$lib/icons/receive.js'
  import Button from '$lib/elements/Button.svelte'

  /** Payment is all invoices, transactions and unused receive addresses
   * 1. Get all invoices, transactions and unused receive addresses
   * 2. For each transaction, lookup if there is a corresponding receive address and attach it if so
   * 3. Map all items to {type, value}
   * 4. Combine all items and then sort by timestamp most recent
   */

  const invoices$ = liveQuery(async () => {
    const invoices = await db.invoices.toArray()
    return invoices.map((data) => ({ type: 'invoice' as 'invoice', data }))
  })

  const transactions$ = liveQuery(async () => {
    const transactions = await db.transactions.toArray()

    return Promise.all(
      transactions.map(async (transaction) => {
        const receiveAddress = await db.addresses.get({ txid: transaction.id })
        return { type: 'transaction' as 'transaction', data: { ...transaction, receiveAddress } }
      })
    )
  })

  const addresses$ = liveQuery(async () => {
    const addresses = await db.addresses.filter(({ txid }) => !txid).toArray()
    return addresses.map((data) => ({ type: 'address' as 'address', data }))
  })

  type InvoiceData = { type: 'invoice'; data: Invoice }
  type AddressData = { type: 'address'; data: Address }
  type TransactionData = { type: 'transaction'; data: Transaction & { receiveAddress?: Address } }

  let payments: (InvoiceData | AddressData | TransactionData)[]

  $: if ($invoices$ && $transactions$ && $addresses$) {
    payments = [...$invoices$, ...$transactions$, ...$addresses$].sort((a, b) => {
      const { type: aType, data: aValue } = a
      const { type: bType, data: bValue } = b
      const { createdAt: aCreated, completedAt: aCompleted } = aValue as Invoice
      const { events: eventsA } = aValue as Transaction
      const { createdAt: bCreated, completedAt: bCompleted } = bValue as Invoice
      const { events: eventsB } = bValue as Transaction

      const aTimestamp =
        aType === 'transaction'
          ? (eventsA.find((e) => (e as ChainEvent).timestamp) as ChainEvent).timestamp || 0
          : aCompleted || aCreated
      const bTimestamp =
        bType === 'transaction'
          ? (eventsB.find((e) => (e as ChainEvent).timestamp) as ChainEvent).timestamp || 0
          : bCompleted || bCreated

      return bTimestamp - aTimestamp
    })
  }
</script>

<Section>
  <div class="w-full flex items-center justify-between">
    <SectionHeading icon={list} />
    <div class="flex items-center">
      <a href="/payments/send" class="no-underline">
        <Button text="Send">
          <div class="w-6 mr-1" slot="iconLeft">{@html send}</div>
        </Button>
      </a>

      <a href="/payments/receive" class="no-underline ml-2">
        <Button text="Receive">
          <div class="w-6 mr-1" slot="iconLeft">{@html receive}</div>
        </Button>
      </a>
    </div>
  </div>

  <div class="w-full overflow-hidden flex h-full">
    {#if !payments}
      <div class="mt-4 w-full flex justify-center">
        <Spinner />
      </div>
    {:else if !payments.length}
      <Msg type="info" message="No payments here, try adding a connection and syncing it." />
    {:else}
      <div class="w-full flex flex-col flex-grow overflow-auto">
        {#each payments as { type, data }}
          <PaymentRow {data} {type} />
        {/each}
      </div>
    {/if}
  </div>
</Section>
