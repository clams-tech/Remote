<script lang="ts">
  import '../app.css'
  import { page } from '$app/stores'
  import { translate } from '$lib/i18n/translations.js'
  import clamsIcon from '$lib/icons/clamsIcon.js'
  import Lava from '$lib/elements/Lava.svelte'
  import { session$ } from '$lib/streams.js'
  import { fade } from 'svelte/transition'
  import { goto } from '$app/navigation'
  import { routeRequiresSession } from '$lib/utils.js'
  import Button from '$lib/elements/Button.svelte'
  import key from '$lib/icons/key.js'
  import Modal from '$lib/elements/Modal.svelte'
  import Decrypt from '$lib/components/Decrypt.svelte'
  import lockOutline from '$lib/icons/lock-outline.js'

  $: path = $page.url.pathname

  const clearSession = () => session$.next(null)

  let showDecryptModal = false
</script>

<svelte:head>
  <title
    >{$session$ || path === '/welcome'
      ? $translate(`app.routes.${$page.url.pathname}.title`)
      : $translate('app.labels.locked')}</title
  >
</svelte:head>

<main class="flex flex-col w-screen h-[calc(100dvh)] text-neutral-50 overflow-hidden">
  <div class="-z-10 overflow-hidden">
    <Lava />
  </div>

  <header class="flex w-full items-center justify-between">
    <div class="flex items-center">
      {#if routeRequiresSession(path) && $session$}
        <button on:click={clearSession} class="w-8 ml-4">{@html lockOutline}</button>
      {/if}
    </div>

    <!-- show clams icon in top right if not welcome or decrypt routes -->
    {#if routeRequiresSession(path)}
      <button class:pointer={path !== '/'} on:click={() => goto('/')} class="w-20 p-2"
        >{@html clamsIcon}</button
      >
    {/if}
  </header>

  <div
    in:fade
    class="flex-grow flex flex-col items-center justify-center overflow-hidden w-full pb-4"
  >
    {#if $session$ || path === '/welcome'}
      <slot />
    {:else}
      <div in:fade={{ duration: 250 }} class="w-min">
        <Button on:click={() => (showDecryptModal = true)} text={$translate('app.labels.unlock')}>
          <div slot="iconRight" class="ml-1 w-6">{@html key}</div>
        </Button>
      </div>
    {/if}

    {#if showDecryptModal}
      <Modal on:close={() => (showDecryptModal = false)}>
        <Decrypt on:close={() => (showDecryptModal = false)} />
      </Modal>
    {/if}
  </div>
</main>
