<script lang="ts">
  import Button from '$lib/components/Button.svelte'
  import Section from '$lib/components/Section.svelte'
  import SectionHeading from '$lib/components/SectionHeading.svelte'
  import { translate } from '$lib/i18n/translations.js'
  import keys from '$lib/icons/keys.js'
  import { onMount, type ComponentType } from 'svelte'
  import type { PageData } from './$types'
  import CoreLn from '$lib/wallets/configurations/coreln/Index.svelte'
  import { type Observable, filter, map, take, takeUntil, BehaviorSubject, from } from 'rxjs'
  import { connectionErrors$, connections$, errors$, onDestroy$, session$ } from '$lib/streams.js'
  import { fade, slide } from 'svelte/transition'
  import settingsOutline from '$lib/icons/settings-outline.js'
  import caret from '$lib/icons/caret.js'
  import { db } from '$lib/db.js'
  import { goto } from '$app/navigation'
  import { nowSeconds } from '$lib/utils.js'
  import refresh from '$lib/icons/refresh.js'
  import ErrorDetail from '$lib/components/ErrorDetail.svelte'
  import trashOutline from '$lib/icons/trash-outline.js'
  import Modal from '$lib/components/Modal.svelte'
  import Paragraph from '$lib/components/Paragraph.svelte'
  import warning from '$lib/icons/warning.js'
  import { decryptWithAES, encryptWithAES } from '$lib/crypto.js'
  import qr from '$lib/icons/qr.js'
  import Qr from '$lib/components/Qr.svelte'
  import { formatDateRelativeToNow } from '$lib/dates.js'
  import { liveQuery } from 'dexie'
  import type { AppError } from '$lib/@types/errors.js'
  import type { Session } from '$lib/@types/session.js'

  import {
    connect,
    walletToConnection,
    connectionOptions,
    syncConnectionData
  } from '$lib/wallets/index.js'

  import type { WalletConfiguration, Wallet, CoreLnConfiguration } from '$lib/@types/wallets.js'

  export let data: PageData

  let { id } = data
  let showConfiguration = false

  const wallet$ = liveQuery(() =>
    db.wallets.get(id).then((wallet) => {
      if (wallet) {
        const { token } = wallet.configuration as CoreLnConfiguration

        if (token) {
          ;(wallet.configuration as CoreLnConfiguration).token = decryptWithAES(
            token,
            (session$.value as Session).secret
          )
        }
      }

      return wallet
    })
  )

  $: connection = $connections$.find((conn) => conn.walletId === id)
  $: status = connection ? connection.connectionStatus$ : new BehaviorSubject(null)

  $: if ($wallet$ && !$wallet$.modifiedAt) {
    showConfiguration = true
  }

  $: walletType = $wallet$ && connectionOptions.find((c) => c.type === $wallet$!.type)

  onMount(() => {
    from(wallet$)
      .pipe(take(1))
      .subscribe((details) => {
        if (!details) {
          goto('/wallets')
        }
      })
  })

  const typeToConfigurationComponent = (type: Wallet['type']): ComponentType => {
    switch (type) {
      case 'coreln':
        return CoreLn
      default:
        throw new Error(`No component for connection type: ${type}`)
    }
  }

  const handleLabelUpdate = async (label: string) => {
    await db.wallets.update(id, { label, modifiedAt: nowSeconds() })
  }

  const handleConfigurationUpdate = async (configuration: WalletConfiguration) => {
    const { token } = configuration as CoreLnConfiguration
    const session = session$.value as Session
    const wallet = { ...($wallet$ as Wallet), configuration }

    // update connection details
    await db.wallets.update(id, {
      configuration: token
        ? { ...configuration, token: encryptWithAES(token, ($session$ as Session).secret) }
        : configuration,
      modifiedAt: nowSeconds()
    })

    // disconnect the old connection interface if exists
    const currentConnections = [...$connections$]
    const oldConnectionIndex = currentConnections.findIndex((conn) => conn.walletId === id)

    if (oldConnectionIndex !== -1) {
      const oldConnection = currentConnections[oldConnectionIndex]
      oldConnection.disconnect && oldConnection.disconnect()
    }

    try {
      // create a new connection interface
      connection = walletToConnection(wallet, session)
      // connect the new connection interface
      connection.connect && (await connection.connect())
    } catch (error) {
      errors$.next(error as AppError)
      return
    }

    // add or replace the connection in connections$
    if (oldConnectionIndex !== -1) {
      currentConnections[oldConnectionIndex] = connection
    } else {
      currentConnections.push(connection)
    }

    connections$.next(currentConnections)

    showConfiguration = false
  }

  const attemptConnect = async () => {
    try {
      await connect($wallet$!)
    } catch (error) {
      errors$.next(error as AppError)
    }
  }

  let syncProgress$: Observable<number> | null = null

  const sync = async () => {
    syncProgress$ = syncConnectionData(connection!, $wallet$?.lastSync || null)

    syncProgress$
      .pipe(
        filter((x) => x === 100),
        take(1)
      )
      .subscribe({
        complete: () => {
          setTimeout(() => (syncProgress$ = null), 250)
        }
      })
  }

  const recentErrors$ = connectionErrors$.pipe(
    map((err) => err[id]),
    takeUntil(onDestroy$)
  )

  let deletingConnection = false

  const deleteConnection = async () => {
    deletingConnection = true

    await db.wallets.delete(id)

    await Promise.all(
      db.tables
        .filter(({ name }) => name !== 'connections' && name !== 'metadata')
        .map(async (table) => table.where('walletId').equals(id).delete())
    )

    setTimeout(() => goto('/wallets'), 250)
  }

  let expandRecentErrors = false
  let showDeleteModal = false
  let showInfoModal = false
</script>

<svelte:head>
  <title>{$translate(`app.routes./wallets/${$wallet$?.type}.title`)}</title>
</svelte:head>

<Section>
  {#if $wallet$}
    {@const { label, type, configuration, lastSync } = $wallet$}

    <div class="flex items-center justify-between border-b border-b-neutral-700 w-full">
      <SectionHeading
        on:updated={({ detail }) => handleLabelUpdate(detail)}
        text={label}
        icon={keys}
        editable
      />

      <div class="flex items-center opacity-80">
        {#if configuration}
          <button
            on:click={() => (showConfiguration = !showConfiguration)}
            class="flex items-center"
          >
            <div class="w-4 transition-all flex-shrink-0" class:rotate-180={showConfiguration}>
              {@html caret}
            </div>
            <div class="w-8 flex-shrink-0">
              {@html settingsOutline}
            </div>
          </button>
        {/if}

        <button on:click={() => (showDeleteModal = true)} class="w-8 ml-1 text-utility-error"
          >{@html trashOutline}</button
        >
      </div>
    </div>

    <div class="flex items-start justify-between mt-4 pb-2">
      <div>
        <div class="flex w-full">
          {#if !$status || $status === 'disconnected'}
            <div class="w-min" in:fade={{ duration: 250 }}>
              <Button on:click={attemptConnect} primary text={$translate('app.labels.connect')} />
            </div>
          {/if}

          {#if $status === 'connected'}
            <div class="flex flex-wrap gap-1" in:fade={{ duration: 250 }}>
              <div class="flex flex-col items-center">
                <div class="relative w-min">
                  <Button
                    disabled={$wallet$ && $wallet$.syncing}
                    on:click={sync}
                    primary
                    text={$translate('app.labels.sync')}
                  >
                    <div
                      class:animate-spin={$wallet$ && $wallet$.syncing}
                      class="w-4 mr-2 -ml-1"
                      slot="iconLeft"
                    >
                      {@html refresh}
                    </div>
                  </Button>

                  {#if syncProgress$}
                    <div class="absolute top-0 left-0 p-1 w-full h-full overflow-hidden">
                      <div class="w-full h-full rounded-full overflow-hidden relative">
                        <div
                          transition:slide={{ duration: 250 }}
                          style="width: {$syncProgress$}%;"
                          class="absolute bottom-0 left-0 h-1.5 transition-all overflow-hidden bg-purple-500/70"
                        />
                      </div>
                    </div>
                  {/if}
                </div>
              </div>

              <div class="w-min">
                <Button
                  on:click={() => (showInfoModal = true)}
                  text={$translate('app.labels.info')}
                >
                  <div slot="iconLeft" class="w-5 mr-1 -ml-2">{@html qr}</div>
                </Button>
              </div>
            </div>
          {/if}
        </div>
      </div>

      <div class="flex items-end flex-col p-0.5">
        {#if walletType}
          <div class="w-full flex items-center justify-end">
            <div class="w-24 mb-2">{@html walletType.icon}</div>
          </div>
        {/if}

        <div class="flex items-center">
          <span
            class="transition-colors whitespace-nowrap text-sm leading-none"
            class:text-utility-success={$status === 'connected'}
            class:text-utility-pending={$status === 'connecting' || $status === 'waiting_reconnect'}
            class:text-utility-error={!$status || $status === 'disconnected'}
            >{$translate(`app.labels.${$status || 'disconnected'}`)}</span
          >

          <div
            class="w-2.5 h-2.5 ml-1 rounded-full transition-colors"
            class:bg-utility-success={$status === 'connected'}
            class:bg-utility-pending={$status === 'connecting' || $status === 'waiting_reconnect'}
            class:bg-utility-error={!$status || $status === 'disconnected'}
          />
        </div>

        {#if $status === 'connected' && lastSync}
          {#await formatDateRelativeToNow(lastSync) then formattedDate}
            <div class="text-xs text-neutral-300">
              {$translate('app.labels.last_synced')} - {formattedDate}
            </div>
          {/await}
        {/if}
      </div>
    </div>

    <!-- Connection Configuration UI -->
    {#if showConfiguration}
      <div transition:slide={{ duration: 250 }} class="w-full mt-2 border-t border-t-neutral-400">
        <svelte:component
          this={typeToConfigurationComponent(type)}
          {configuration}
          on:updated={({ detail }) => handleConfigurationUpdate(detail)}
        />
      </div>
    {/if}

    {#if $recentErrors$}
      <button
        on:click={() => (expandRecentErrors = !expandRecentErrors)}
        class="mt-4 flex items-center text-sm cursor-pointer w-full font-semibold"
      >
        <div class:-rotate-90={!expandRecentErrors} class="w-3 mr-1 transition-transform">
          {@html caret}
        </div>

        <span class="underline">{$translate('app.labels.recent_errors')}</span>
      </button>

      {#if expandRecentErrors}
        <div
          transition:slide={{ duration: 250 }}
          class="text-sm mt-2 pl-4 pr-[1px] flex flex-col items-start w-full gap-y-2"
        >
          {#each $recentErrors$ as error}
            <ErrorDetail {error} />
          {/each}
        </div>
      {/if}
    {/if}
  {/if}
</Section>

{#if showInfoModal && connection}
  {@const { id, alias, version, host, port } = connection.info}
  <Modal on:close={() => (showInfoModal = false)}>
    {#if alias}
      <div class="w-full flex items-baseline mb-4">
        <h4 class="font-semibold text-3xl">
          {alias}
        </h4>

        {#if version}
          <div class="ml-2">{version}</div>
        {/if}
      </div>
    {/if}

    <Qr
      values={[
        ...(host
          ? [{ label: $translate('app.labels.connect'), value: `${id}@${host}:${port}` }]
          : []),
        { label: $translate('app.labels.pubkey'), value: id }
      ]}
    />
  </Modal>
{/if}

{#if showDeleteModal}
  <Modal on:close={() => (showDeleteModal = false)}>
    <div class="w-full">
      <SectionHeading
        text={$translate('app.routes./connections.delete_connection_modal.heading')}
      />
      <Paragraph
        >{$translate('app.routes./connections.delete_connection_modal.paragraph')}</Paragraph
      >
    </div>

    <div class="mt-4 w-full flex justify-end">
      <div class="w-min">
        <Button
          requesting={deletingConnection}
          on:click={deleteConnection}
          warning
          text={$translate('app.labels.delete')}
        >
          <div slot="iconLeft" class="w-6 mr-1 -ml-2">{@html warning}</div>
        </Button>
      </div>
    </div>
  </Modal>
{/if}