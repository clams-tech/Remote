<script lang="ts">
  import { fade } from 'svelte/transition'
  import { lastPath$, payments$ } from '$lib/streams'
  import { goto } from '$app/navigation'
  import PaymentDetails from '$lib/components/PaymentDetails.svelte'
  import BackButton from '$lib/elements/BackButton.svelte'
  import { translate } from '$lib/i18n/translations'
  import Spinner from '$lib/elements/Spinner.svelte'
  import ErrorMsg from '$lib/elements/ErrorMsg.svelte'

  export let data: { id: string } // payment id

  $: payment = $payments$.data && $payments$.data.find((p) => p.id === data.id)

  function handleClose() {
    const path = lastPath$.value

    // for recently completed send or receive, we want to go home
    if (path === '/send' || path === '/receive' || path === '/scan') {
      goto('/')
    } else {
      goto(path)
    }
  }
</script>

<svelte:head>
  <title>{$translate('app.titles.payment')}</title>
</svelte:head>

<section in:fade class="flex flex-col justify-center items-center h-full w-full max-w-lg">
  <BackButton on:click={handleClose} />

  {#if $payments$.loading && !$payments$.data}
    <div class="w-full h-full flex items-center justify-center">
      <Spinner />
    </div>
  {:else if $payments$.error}
    <div class="w-full h-full flex items-center justify-center">
      <ErrorMsg message={$payments$.error} />
    </div>
  {:else if payment}
    <PaymentDetails {payment} />
  {/if}
</section>
