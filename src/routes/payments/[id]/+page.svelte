<script lang="ts">
  import { fade } from 'svelte/transition'
  import { lastPath$, payments$ } from '$lib/streams'
  import { goto } from '$app/navigation'
  import PaymentDetails from '$lib/components/PaymentDetails.svelte'
  import BackButton from '$lib/elements/BackButton.svelte'
  import { translate } from '$lib/i18n/translations'
  import Spinner from '$lib/elements/Spinner.svelte'
  import ErrorMsg from '$lib/elements/ErrorMsg.svelte'
  import type { PageData } from './$types'

  export let data: PageData // payment id

  $: payment = $payments$.data && $payments$.data.find((p) => p.id === data.id)

  const backPath = getBackPath()

  function back() {
    if (backPath !== '/') {
      lastPath$.next('/')
    }

    goto(backPath)
  }

  function getBackPath() {
    const path = lastPath$.value
    return path === '/send' || path === '/receive' || path === '/scan' || path.includes('/offers/')
      ? '/'
      : path
  }
</script>

<svelte:head>
  <title>{$translate('app.titles./payment')}</title>
</svelte:head>

<section
  in:fade|local={{ duration: 250 }}
  class="flex flex-col justify-center items-center h-full w-full max-w-lg"
>
  <BackButton on:click={back} text={$translate(`app.titles.${backPath}`)} />
  <div class="w-full h-20 bg-white dark:bg-neutral-900" />

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
