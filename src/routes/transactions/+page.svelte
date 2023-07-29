<script lang="ts">
  import type { Address } from '$lib/@types/addresses.js'
  import type { Invoice } from '$lib/@types/invoices.js'
  import type { Transaction } from '$lib/@types/transactions.js'
  import { db } from '$lib/db.js'
  import Msg from '$lib/elements/Msg.svelte'
  import Section from '$lib/elements/Section.svelte'
  import SectionHeading from '$lib/elements/SectionHeading.svelte'
  import Spinner from '$lib/elements/Spinner.svelte'
  import list from '$lib/icons/list.js'
  import { liveQuery } from 'dexie'
  import TransactionRow from './components/TransactionRow.svelte'
  import receive from '$lib/icons/receive.js'
  import { fade, slide } from 'svelte/transition'
  import filter from '$lib/icons/filter.js'
  import { endOfDay } from 'date-fns'
  import { inPlaceSort } from 'fast-sort'
  import { formatDate } from '$lib/dates.js'
  import debounce from 'lodash.debounce'

  const invoices$ = liveQuery(async () => {
    const invoices = await db.invoices.toArray()
    return invoices.map((data) => ({
      type: 'invoice' as 'invoice',
      data,
      timestamp: data.completedAt || data.createdAt
    }))
  })

  const transactions$ = liveQuery(async () => {
    const transactions = await db.transactions.toArray()

    return Promise.all(
      transactions.map(async (transaction) => {
        const receiveAddress = await db.addresses.get({ txid: transaction.id })
        return {
          type: 'transaction' as 'transaction',
          data: { ...transaction, receiveAddress },
          timestamp: transaction.events
            ? transaction.events[0].timestamp
            : receiveAddress
            ? receiveAddress.createdAt
            : 0
        }
      })
    )
  })

  const addresses$ = liveQuery(async () => {
    const addresses = await db.addresses.filter(({ txid }) => !txid).toArray()
    return addresses.map((data) => ({
      type: 'address' as 'address',
      data,
      timestamp: data.createdAt
    }))
  })

  type InvoiceData = { type: 'invoice'; data: Invoice; timestamp: number }
  type AddressData = { type: 'address'; data: Address; timestamp: number }
  type TransactionData = {
    type: 'transaction'
    data: Transaction & { receiveAddress?: Address }
    timestamp: number
  }

  type Payment = InvoiceData | AddressData | TransactionData
  type PaymentsMap = Map<number, Payment[]>
  type DailyPayments = [number, Payment[]][]

  let dailyPayments: DailyPayments

  $: if ($invoices$ && $transactions$ && $addresses$) {
    const unsorted = [...$invoices$, ...$transactions$, ...$addresses$].reduce((acc, payment) => {
      const date = new Date(payment.timestamp * 1000)
      const dateKey = endOfDay(date).getTime() / 1000
      acc.set(dateKey, [...(acc.get(dateKey) || []), payment])

      return acc
    }, new Map() as PaymentsMap)

    dailyPayments = inPlaceSort(Array.from(unsorted.entries())).desc(([timestamp]) => timestamp)
  }

  let showFilters = false
  const toggleFilters = () => (showFilters = !showFilters)

  let showFullReceiveButton = false
  let transactionsContainer: HTMLDivElement
  let transactionsContainerScrollable = false
  let innerHeight: number

  $: if (innerHeight && transactionsContainer) {
    calculateScrollable(transactionsContainer)
  }

  const calculateScrollable = debounce((transactionsContainer: HTMLDivElement) => {
    if (transactionsContainer.scrollHeight > transactionsContainer.clientHeight) {
      transactionsContainerScrollable = true
    } else {
      transactionsContainerScrollable = false
    }
  }, 500)
</script>

<svelte:window bind:innerHeight />

<Section>
  <div class="w-full flex items-center justify-between">
    <SectionHeading icon={list} />

    <button on:click={toggleFilters} class="w-8">{@html filter}</button>
  </div>

  {#if showFilters}
    <div in:slide>
      <!-- @TODO - Checkbox filters -->
    </div>
  {/if}

  <div class="w-full overflow-hidden flex flex-grow">
    {#if !dailyPayments}
      <div in:fade={{ duration: 250 }} class="mt-4 w-full flex justify-center">
        <Spinner />
      </div>
    {:else if !dailyPayments.length}
      <Msg type="info" message="No payments here, try adding a connection and syncing it." />
    {:else}
      <div
        bind:this={transactionsContainer}
        in:fade={{ duration: 250 }}
        class="w-full flex flex-col flex-grow overflow-auto gap-y-2 relative"
      >
        <!-- @TODO - Need to virtualise this list to only render items in view since it could be massive -->
        {#each dailyPayments as [day, payments] (day)}
          <div>
            {#await formatDate(day) then formattedDate}
              <div
                class="text-xs font-semibold mb-1 sticky top-0 py-1 px-2 rounded bg-neutral-900 w-min whitespace-nowrap"
              >
                {formattedDate}
              </div>
            {/await}
            <div class="rounded overflow-hidden">
              <div class="overflow-hidden">
                {#each inPlaceSort(payments).desc(({ timestamp }) => timestamp) as { type, data } (data.id)}
                  <TransactionRow {data} {type} />
                {/each}
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <div class="w-full flex justify-end">
    <a
      href="/receive"
      class:absolute={transactionsContainerScrollable}
      class:px-2={transactionsContainerScrollable}
      class:px-4={!transactionsContainerScrollable || showFullReceiveButton}
      class="bottom-7 right-5 no-underline flex items-center rounded-full bg-neutral-900 py-2 shadow shadow-neutral-50 mt-2 w-min"
      on:mouseenter={() => !showFullReceiveButton && (showFullReceiveButton = true)}
      on:mouseleave={() => showFullReceiveButton && (showFullReceiveButton = false)}
    >
      <div class="w-6">{@html receive}</div>

      {#if !transactionsContainerScrollable || showFullReceiveButton}
        <div class="ml-1 font-semibold" in:slide={{ axis: 'x' }}>Receive</div>
      {/if}
    </a>
  </div>
</Section>
