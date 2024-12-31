<script lang="ts">
  import '../app.css'
  import { page } from '$app/stores'
  import { translate } from '$lib/i18n/translations.js'
  import Lava from '$lib/components/Lava.svelte'
  import { fade, slide } from 'svelte/transition'
  import { afterNavigate, goto } from '$app/navigation'
  import { routeRequiresSession } from '$lib/utils.js'
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
  import { combineLatest, delay, filter, take, takeUntil } from 'rxjs'
  import lock from '$lib/icons/lock.js'
  import { db } from '$lib/db/index.js'
  import type { Wallet, WalletConfiguration } from '$lib/@types/wallets.js'
  import { notification } from '$lib/services.js'
  import { browser } from '$app/environment'
  import Notifications from '$lib/components/Notifications.svelte'
  import { autoConnectWallet } from './auto-connect.js'
  import { createRandomHex } from '$lib/crypto.js'
  import info from '$lib/icons/info.js'
  import InfoModal from '$lib/components/InfoModal.svelte'
  import type { Session } from '$lib/@types/session.js'
  import { validateWalletConfiguration } from '$lib/wallets/validation.js'
  import RemoteBoltIcon from '$lib/icons/remote-bolt'
  import { base } from '$app/paths'

  import {
    autoConnectWallet$,
    errors$,
    larpMode$,
    session$,
    settings$,
    wallets$
  } from '$lib/streams.js'

  const clearSession = () => session$.next(null)

  let showDecryptModal = false
  let routeHistory: string[] = []

  $: path = $page.url.pathname

  let connections: { wallet: Wallet; connection: Connection | null }[] = []

  const initializeConnections = async (wallets: Wallet[]) => {
    connections = await Promise.all(
      wallets.map(async wallet => {
        try {
          validateWalletConfiguration(wallet)
        } catch (error) {
          return { wallet, connection: null }
        }

        let connection: Connection | null
        await db.wallets.update(wallet.id, { syncing: false })

        try {
          connection = await connect(wallet)
        } catch (error) {
          connection = null
          errors$.next(error as AppError)
        }

        return { wallet, connection }
      })
    )

    connections.forEach(({ wallet, connection }) => {
      if (connection) {
        syncConnectionData(connection, wallet.lastSync)
        connection.errors$.pipe(takeUntil(connection.destroy$)).subscribe(errors$)
      }
    })
  }

  if (!!autoConnectWallet$.value) {
    const { configuration, label, type } = autoConnectWallet$.value

    if (path !== '/') {
      goto('/')
    }

    session$
      .pipe(
        filter(x => !!x),
        // allow time for wallets$ to be populated
        delay(250),
        take(1)
      )
      .subscribe(async session => {
        const { secret } = session as Session

        const { wallet, existed } = await autoConnectWallet({
          configuration: configuration as WalletConfiguration,
          label,
          type,
          secret
        })

        try {
          if (existed) {
            notification.create({
              id: createRandomHex(8),
              heading: $translate('app.labels.wallet_connected'),
              message: $translate('app.labels.wallet_already_connected_description', { label })
            })
          } else {
            notification.create({
              id: createRandomHex(8),
              heading: $translate('app.labels.wallet_connected'),
              message: $translate('app.labels.wallet_connected_success_description', { label }),
              onclick: () => goto(`/wallets/${wallet.id}`)
            })
          }
        } catch (error) {
          //
        }

        autoConnectWallet$.next(null)

        // wait until wallet is loaded in to memory and then init connections
        wallets$
          .pipe(
            filter(wallets => !!wallets.find(({ id }) => id === wallet.id)),
            take(1)
          )
          .subscribe(wallets => {
            initializeConnections(wallets)
          })
      })
  } else {
    // initialize all connections once after the session is decrypted
    combineLatest([wallets$, session$])
      .pipe(
        filter(([wallets, session]) => !!session && !!wallets.length),
        take(1)
      )
      .subscribe(([wallets]) => initializeConnections(wallets))
  }

  let infoModal = false
  const toggleInfoModal = () => (infoModal = !infoModal)

  afterNavigate(({ from, to }) => {
    if (to && to.url.pathname === '/') {
      routeHistory = []
    } else if (from?.url) {
      routeHistory = [
        `${from.url.pathname}${from.url.search ? from.url.search : ''}`,
        ...routeHistory
      ]
    }
  })

  if (browser) {
    settings$.next({ ...$settings$, notifications: notification.permission() })
  }

  const back = async () => {
    const [backPath, ...previousRoutes] = routeHistory

    if (backPath) {
      await goto(backPath)
      routeHistory = previousRoutes
    }
  }
</script>

<svelte:head>
  {#if !$session$ && path !== 'welcome'}
    <title>{$translate('app.labels.locked')}</title>
  {/if}
</svelte:head>

<main class="flex flex-col w-screen h-screen text-neutral-50">
  {#if $settings$.lavaLamp}
    <div transition:fade class="-z-10 overflow-hidden">
      <Lava />
    </div>
  {/if}

  <header class="flex w-full items-center justify-between">
    <!-- show remote icon in top left if not welcome or decrypt routes -->
    {#if routeRequiresSession(path)}
      {@const lastPathRouteTitle = $translate(`app.routes.${routeHistory[0]}.title`, {
        default: 'undefined'
      })}
      <div class="flex items-center">
        <button class:pointer={path !== '/'} on:click={() => goto('/')} class="w-10 p-1"
          >{@html RemoteBoltIcon}</button
        >

        {#if routeHistory[0]}
          <button
            on:click={back}
            transition:slide={{ axis: 'x' }}
            class="flex items-center font-semibold whitespace-nowrap"
          >
            <div class="w-6 -ml-2 rotate-90 flex-shrink-0">{@html caret}</div>
            <div>
              {!lastPathRouteTitle || lastPathRouteTitle === 'undefined'
                ? $translate('app.labels.back')
                : lastPathRouteTitle}
            </div>
          </button>
        {/if}
      </div>
    {/if}

    <div class="items-center grid grid-cols-3 gap-x-2 mr-2">
      {#if routeRequiresSession(path) && $session$}
        {#if $larpMode$}
          {#if $wallets$.length}
            <button
              in:slide={{ axis: 'x' }}
              on:click={toggleInfoModal}
              class="flex flex-col items-center justify-center"
            >
              <div class="w-8">{@html info}</div>
              <span class="text-xs font-semibold">{$translate('app.labels.info')}</span>
            </button>
          {:else}
            <div />
          {/if}
        {:else}
          <button on:click={clearSession} class="flex flex-col items-center justify-center">
            <div class="w-8">{@html lock}</div>
            <span class="text-xs font-semibold">{$translate('app.labels.lock')}</span>
          </button>
        {/if}

        <a href="${base}/input" class="flex flex-col items-center justify-center no-underline">
          <div class="w-8">{@html scan}</div>
          <span class="text-xs font-semibold">{$translate('app.labels.scan')}</span>
        </a>

        <a
          href="${base}/payments/receive"
          class="flex flex-col items-center justify-center no-underline"
        >
          <div class="w-8">{@html plus}</div>
          <span class="text-xs font-semibold">{$translate('app.labels.receive')}</span>
        </a>
      {/if}
    </div>
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

  <Notifications />

  {#if infoModal}
    {@const firstConnection = connections.find(({ connection }) => !!connection)}

    {#if firstConnection?.connection}
      <InfoModal connection={firstConnection.connection} on:close={toggleInfoModal} />
    {/if}
  {/if}
</main>
