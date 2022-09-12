<script lang="ts">
  import { lastPath$, payments$, paymentUpdates$ } from '$lib/streams'
  import { goto } from '$app/navigation'
  import { fade } from 'svelte/transition'
  import Slide from '$lib/elements/Slide.svelte'
  import PaymentRow from '$lib/components/PaymentRow.svelte'
  import TextInput from '$lib/elements/TextInput.svelte'
  import { translate } from '$lib/i18n/translations'
  import Spinner from '$lib/elements/Spinner.svelte'
  import type { Payment } from '$lib/types'
  import Search from '$lib/icons/Search.svelte'

  let searchTerm = ''
  let filteredPayments: Payment[] = []

  $: payments = $payments$.data

  $: if (payments) {
    // check for expired invoices that need status updated
    const expiredPayments = payments.filter(({ status, expiresAt }) => {
      if (status === 'pending' && expiresAt && Date.now() > new Date(expiresAt).getTime()) {
        return true
      }

      return false
    })

    expiredPayments.forEach((payment) => paymentUpdates$.next({ ...payment, status: 'expired' }))

    // set filtered payments to current payments
    filteredPayments = payments
  }

  $: if (searchTerm && payments) {
    filteredPayments = payments.filter(({ status, direction, value, description }) => {
      const paymentString = JSON.stringify({ status, direction, value, description })
      return paymentString.toLowerCase().includes(searchTerm.toLowerCase())
    })
  } else {
    filteredPayments = payments || []
  }
</script>

<svelte:head>
  <title>{$translate('app.titles.payments')}</title>
</svelte:head>

<Slide
  back={() => {
    goto('/')
  }}
  direction={$lastPath$ && $lastPath$.includes('payments') ? 'right' : 'left'}
>
  <section in:fade class="flex flex-col items-center justify-start w-full p-6 max-w-xl">
    <h1 class="text-lg w-full text-center mt-2 pb-2 font-bold">
      {$translate('app.titles.payments')}
    </h1>

    <div class="w-full mt-2 mb-6 relative flex items-center shadow-sm">
      <TextInput bind:value={searchTerm} placeholder="Search" type="text" name="filter" />
      <div class="absolute right-1 w-8 text-neutral-400"><Search /></div>
    </div>

    {#if $payments$.loading}
      <Spinner />
    {:else if $payments$.error}
      <!-- @TODO - Ensure renders error correctly -->
      <span>{$payments$.error}</span>
    {:else if filteredPayments}
      <div class="w-full overflow-y-auto overflow-x-hidden">
        {#each filteredPayments as payment (payment.id)}
          <PaymentRow {payment} />
        {/each}
      </div>
    {/if}
  </section>
</Slide>
