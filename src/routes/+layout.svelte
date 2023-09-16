<script lang="ts">
  import '../app.css'
  import { page } from '$app/stores'
  import { translate } from '$lib/i18n/translations.js'
  import clamsIconPlain from '$lib/icons/clamsIconPlain.js'
  import Lava from '$lib/components/Lava.svelte'
  import { autoConnectWallet$, errors$, session$, settings$, wallets$ } from '$lib/streams.js'
  import { fade, slide } from 'svelte/transition'
  import { afterNavigate, goto } from '$app/navigation'
  import { nowSeconds, routeRequiresSession } from '$lib/utils.js'
  import Button from '$lib/components/Button.svelte'
  import key from '$lib/icons/key.js'
  import Modal from '$lib/components/Modal.svelte'
  import Decrypt from '$lib/components/Decrypt.svelte'
  import scan from '$lib/icons/scan.js'
  import caret from '$lib/icons/caret.js'
  import { connect, syncConnectionData } from '$lib/wallets/index.js'
  import type { Connection } from '$lib/wallets/interfaces.js'
  import type { AppError } from '$lib/@types/errors.js'
  import plus from '$lib/icons/plus.js'
  import { combineLatest, filter, take, takeUntil } from 'rxjs'
  import lock from '$lib/icons/lock.js'
  import { db } from '$lib/db.js'
  import type { CoreLnConfiguration } from '$lib/@types/wallets.js'
  import { createRandomHex, encryptWithAES } from '$lib/crypto.js'

  const clearSession = () => session$.next(null)

  let showDecryptModal = false
  let routeHistory: string[] = []

  $: path = $page.url.pathname

  $: if ($autoConnectWallet$ && $session$) {
    const { configuration, label, type } = $autoConnectWallet$
    const { token } = configuration as CoreLnConfiguration
    const id = createRandomHex()

    const wallet = {
      id,
      label,
      type,
      createdAt: nowSeconds(),
      modifiedAt: nowSeconds(),
      configuration:
        token && configuration
          ? { ...configuration, token: encryptWithAES(token, $session$.secret) }
          : configuration,
      lastSync: null,
      syncing: false
    }

    db.wallets.add(wallet)

    connect(wallet).then((connection) => syncConnectionData(connection, null))

    autoConnectWallet$.next(null)
  }

  const initializeConnections = async () => {
    const connections = await Promise.all(
      $wallets$.map(async (wallet) => {
        let connection: Connection | null

        await db.wallets.update(wallet.id, { syncing: false })

        try {
          connection = await connect(wallet)
        } catch (error) {
          connection = null
          errors$.next(error as AppError)
        }
        return { detail: wallet, connection }
      })
    )

    connections.forEach(({ detail, connection }) => {
      if (connection) {
        syncConnectionData(connection, detail.lastSync)
        connection.errors$.pipe(takeUntil(connection.destroy$)).subscribe(errors$)
      }
    })
  }

  // initialize all connections once after the session is decrypted
  combineLatest([session$, wallets$])
    .pipe(
      filter(([session, wallets]) => !!session && !!wallets),
      take(1)
    )
    .subscribe(initializeConnections)

  afterNavigate(({ from, to }) => {
    if (to && to.url.pathname === '/') {
      routeHistory = []
    } else if (from?.url) {
      routeHistory = [from.url.pathname, ...routeHistory]
    }
  })

  const back = async () => {
    const [backPath, ...previousRoutes] = routeHistory

    if (backPath) {
      await goto(backPath)
      routeHistory = previousRoutes
    }
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
  {#if $settings$.lavaLamp}
    <div transition:fade class="-z-10 overflow-hidden">
      <Lava />
    </div>
  {/if}

  <header class="flex w-full items-center justify-between">
    <div class="flex items-center">
      {#if routeRequiresSession(path) && $session$}
        <button on:click={clearSession} class="w-8 ml-4">{@html lock}</button>
        <a href="/input" class="w-9 ml-2">{@html scan}</a>
        <a href="/payments/receive" class="w-9 ml-1">{@html plus}</a>
      {/if}
    </div>

    <!-- show clams icon in top right if not welcome or decrypt routes -->
    {#if routeRequiresSession(path)}
      {@const lastPathRouteTitle = $translate(`app.routes.${routeHistory[0]}.title`, {
        default: 'undefined'
      })}
      <div class="flex items-center">
        {#if routeHistory[0]}
          <button
            on:click={back}
            transition:slide={{ axis: 'x' }}
            class="flex items-center ml-2 font-semibold whitespace-nowrap"
          >
            <div class="w-6 rotate-90 flex-shrink-0">{@html caret}</div>
            <div>
              {!lastPathRouteTitle || lastPathRouteTitle === 'undefined'
                ? $translate('app.labels.back')
                : lastPathRouteTitle}
            </div>
          </button>
        {/if}

        <button class:pointer={path !== '/'} on:click={() => goto('/')} class="w-20 p-2"
          >{@html clamsIconPlain}</button
        >
      </div>
    {/if}
  </header>

  <div
    in:fade
    class="flex-grow flex flex-col items-center justify-center overflow-hidden w-full pb-4 sm:pb-6"
  >
    {#if $session$ || path === '/welcome'}
      <slot />
    {:else}
      <div in:fade={{ duration: 250 }} class="w-min">
        <Button on:click={() => (showDecryptModal = true)} text={$translate('app.labels.unlock')}>
          <div slot="iconLeft" class="mr-1 w-6 -ml-2">{@html key}</div>
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
