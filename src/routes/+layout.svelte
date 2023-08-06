<script lang="ts">
  import '../app.css'
  import { page } from '$app/stores'
  import { translate } from '$lib/i18n/translations.js'
  import clamsIcon from '$lib/icons/clamsIcon.js'
  import Lava from '$lib/elements/Lava.svelte'
  import { previousPaths$, session$ } from '$lib/streams.js'
  import { fade, slide } from 'svelte/transition'
  import { goto } from '$app/navigation'
  import { routeRequiresSession } from '$lib/utils.js'
  import Button from '$lib/elements/Button.svelte'
  import key from '$lib/icons/key.js'
  import Modal from '$lib/elements/Modal.svelte'
  import Decrypt from '$lib/components/Decrypt.svelte'
  import lockOutline from '$lib/icons/lock-outline.js'
  import scan from '$lib/icons/scan.js'
  import caret from '$lib/icons/caret.js'
  import { db } from '$lib/db.js'
  import { connect, syncConnectionData } from '$lib/connections/index.js'

  const clearSession = () => session$.next(null)

  let showDecryptModal = false
  let back: string | null

  $: path = $page.url.pathname

  $: if (
    path !== '/' &&
    $previousPaths$[1] &&
    $previousPaths$[1] !== path &&
    $previousPaths$[1] !== '/' &&
    !$previousPaths$.slice(2).includes($previousPaths$[1])
    // && $previousPaths$[0] !== $previousPaths$[2]
  ) {
    back = $previousPaths$[1]
  } else {
    back = null
  }

  const initializeConnections = async () => {
    const connectionsDetails = await db.connections.toArray()
    const connections = await Promise.all(
      connectionsDetails.map(async (connectionDetail) => ({
        detail: connectionDetail,
        connection: await connect(connectionDetail)
      }))
    )

    connections.forEach(({ detail, connection }) => {
      if (connection.connectionStatus$.value === 'connected') {
        syncConnectionData(connection, detail.lastSync)
      }
    })
  }

  $: if ($session$) {
    initializeConnections()
  }
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
        <a href="/input" class="w-9 ml-2">{@html scan}</a>
      {/if}
    </div>

    <!-- show clams icon in top right if not welcome or decrypt routes -->
    {#if routeRequiresSession(path)}
      {@const lastPathRouteTitle = $translate(`app.routes.${$previousPaths$[1]}.title`, {
        default: 'undefined'
      })}
      <div class="flex items-center">
        {#if back && lastPathRouteTitle !== 'undefined'}
          <a
            transition:slide={{ axis: 'x' }}
            href={back}
            class="flex items-center ml-2 no-underline font-semibold whitespace-nowrap"
          >
            <div class="w-6 rotate-90 flex-shrink-0">{@html caret}</div>
            <div>
              {lastPathRouteTitle}
            </div>
          </a>
        {/if}
        <button class:pointer={path !== '/'} on:click={() => goto('/')} class="w-20 p-2"
          >{@html clamsIcon}</button
        >
      </div>
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
