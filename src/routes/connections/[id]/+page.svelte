<script lang="ts">
  import Button from '$lib/elements/Button.svelte'
  import Section from '$lib/elements/Section.svelte'
  import SectionHeading from '$lib/elements/SectionHeading.svelte'
  import { translate } from '$lib/i18n/translations.js'
  import keys from '$lib/icons/keys.js'
  import type { ComponentType } from 'svelte'
  import type { PageData } from './$types'
  import CoreLn from '$lib/connections/configurations/coreln/Index.svelte'
  import type { ConnectionStatus } from 'lnmessage/dist/types.js'
  import { type Observable, filter, map, take, takeUntil } from 'rxjs'
  import { connectionErrors$, connections$, errors$, onDestroy$, session$ } from '$lib/streams.js'
  import { connectionDetailsToInterface, syncConnectionData } from '$lib/connections/index.js'
  import { fade, slide } from 'svelte/transition'
  import settingsOutline from '$lib/icons/settings-outline.js'
  import caret from '$lib/icons/caret.js'
  import { liveQuery } from 'dexie'
  import { db } from '$lib/db.js'
  import Msg from '$lib/elements/Msg.svelte'
  import { goto } from '$app/navigation'
  import type { ConnectionInterface } from '$lib/connections/interfaces.js'
  import { nowSeconds } from '$lib/utils.js'
  import refresh from '$lib/icons/refresh.js'
  import ErrorDetail from '$lib/components/ErrorDetail.svelte'
  import trashOutline from '$lib/icons/trash-outline.js'
  import Modal from '$lib/elements/Modal.svelte'
  import Paragraph from '$lib/elements/Paragraph.svelte'
  import warning from '$lib/icons/warning.js'
  import { decryptWithAES, encryptWithAES } from '$lib/crypto.js'
  import qr from '$lib/icons/qr.js'
  import close from '$lib/icons/close.js'
  import Qr from '$lib/elements/Qr.svelte'

  import type {
    ConnectionConfiguration,
    ConnectionDetails,
    CoreLnConfiguration
  } from '$lib/@types/connections.js'
  import type { AppError } from '$lib/@types/errors.js'

  export let data: PageData

  let { id } = data
  let connection: ConnectionInterface | undefined
  let status: ConnectionStatus
  let showConfiguration = false
  let connectionError = ''
  let syncing = false

  const checkForConnectionDetails = async () => {
    const connectionDetails = (await db.connections.get(id)) as ConnectionDetails

    // no record of this connection, so redirect
    if (!connectionDetails) {
      await goto('/connections')
      return
    }

    connection = connections$.value.find((connection) => connection.info.connectionId === id)

    /**if we have not modified from original creation
     * show the configuration options automatically as it is a
     * brand new connection
     */
    if (!connectionDetails.modifiedAt) {
      showConfiguration = true
    }
  }

  checkForConnectionDetails()

  const connectionDetails$ = liveQuery(() =>
    db.connections.get(id).then((details) => {
      if (!details) return

      const { configuration } = details as ConnectionDetails
      const { token } = configuration as CoreLnConfiguration

      /** decrypt stored token*/
      if (token) {
        ;(configuration as CoreLnConfiguration).token = decryptWithAES(token, $session$?.secret!)
      }

      return {
        ...details,
        ...(configuration ? { configuration } : {})
      }
    })
  )

  $: if (connection) {
    connection.connectionStatus$.pipe(takeUntil(onDestroy$)).subscribe((newStatus) => {
      status = newStatus
    })
  }

  const typeToConfigurationComponent = (type: ConnectionDetails['type']): ComponentType => {
    switch (type) {
      case 'coreln':
        return CoreLn
      default:
        throw new Error(`No component for connection type: ${type}`)
    }
  }

  const listenForConnectionErrors = (connection: ConnectionInterface) => {
    connection.errors$.pipe(takeUntil(connection.destroy$)).subscribe(errors$)
  }

  const connect = async () => {
    connectionError = ''

    // @TODO - Need to validate connection before connecting?
    // otherwise we need to throw a nicer error

    /** create a fresh connection*/
    try {
      connection = connectionDetailsToInterface($connectionDetails$!, $session$!)
      connection.connect && (await connection.connect())
      connections$.next([...$connections$, connection])
      listenForConnectionErrors(connection)

      // refresh info UI
      connection = connection
    } catch (error) {
      connectionError = $translate(`app.errors.${(error as AppError).key}`)
    }
  }

  const disconnect = () => {
    connection && connection.disconnect && connection.disconnect()
  }

  const handleLabelUpdate = async (label: string) => {
    await db.connections.update(id, { label, modifiedAt: nowSeconds() })
  }

  const handleConfigurationUpdate = async (configuration: ConnectionConfiguration) => {
    const { token } = configuration as CoreLnConfiguration

    // encrypt token before storing
    if (token) {
      ;(configuration as CoreLnConfiguration).token = encryptWithAES(token, $session$?.secret!)
    }

    await db.connections.update(id, { configuration, modifiedAt: nowSeconds() })
    showConfiguration = false
  }

  let syncProgress$: Observable<number> | null = null

  // @TODO display last sync timestamp if available

  const sync = async () => {
    syncing = true
    syncProgress$ = syncConnectionData(connection!, $connectionDetails$?.lastSync || null)

    syncProgress$
      .pipe(
        filter((x) => x === 100),
        take(1)
      )
      .subscribe({
        complete: () => {
          db.connections.update(id, { lastSync: nowSeconds() })
          syncing = false
          setTimeout(() => (syncProgress$ = null), 250)
        }
      })
  }

  const recentErrors$ = connectionErrors$.pipe(
    map((err) => err[id]),
    takeUntil(onDestroy$)
  )

  const deleteConnection = async () => {
    await db.connections.delete(id)
    setTimeout(() => goto('/connections'), 250)
  }

  let expandRecentErrors = false
  let showDeleteModal = false
  let showInfoModal = false
</script>

<svelte:head>
  <title>{$translate(`app.routes./connections/${$connectionDetails$?.type}.title`)}</title>
</svelte:head>

<Section>
  {#if $connectionDetails$}
    {@const { label, type, configuration } = $connectionDetails$}

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

    <div class="flex items-center justify-between mt-4">
      <div class="flex w-full">
        {#if !status || status === 'disconnected'}
          <div class="w-min" in:fade={{ duration: 250 }}>
            <Button on:click={connect} primary text={$translate('app.labels.connect')} />
          </div>
        {/if}

        {#if status && status === 'connected'}
          <div class="flex flex-wrap gap-x-2 gap-y-2" in:fade={{ duration: 250 }}>
            <div class="relative w-min">
              <Button
                disabled={syncing}
                on:click={sync}
                primary
                text={$translate('app.labels.sync')}
              >
                <div class:animate-spin={syncing} class="w-4 ml-2" slot="iconRight">
                  {@html refresh}
                </div>
              </Button>

              {#if syncProgress$}
                <div class="w-full h-full rounded-full overflow-hidden absolute top-0 p-0.5">
                  <div
                    transition:slide={{ duration: 250 }}
                    style="width: {$syncProgress$}%;"
                    class="absolute bottom-0 left-0 h-1.5 transition-all bg-purple-500"
                  />
                </div>
              {/if}
            </div>

            <div class="w-min">
              <Button on:click={() => (showInfoModal = true)} text={$translate('app.labels.info')}>
                <div slot="iconRight" class="w-5 ml-2">{@html qr}</div>
              </Button>
            </div>
          </div>
        {/if}
      </div>

      <div class="flex items-center py-2">
        <div class="flex items-center">
          <span
            class="transition-colors whitespace-nowrap"
            class:text-utility-success={status === 'connected'}
            class:text-utility-pending={status === 'connecting' || status === 'waiting_reconnect'}
            class:text-utility-error={!status || status === 'disconnected'}
            >{$translate(`app.labels.${status || 'disconnected'}`)}</span
          >

          <div
            class="w-2.5 h-2.5 ml-2 rounded-full transition-colors"
            class:bg-utility-success={status === 'connected'}
            class:bg-utility-pending={status === 'connecting' || status === 'waiting_reconnect'}
            class:bg-utility-error={!status || status === 'disconnected'}
          />

          {#if status === 'connected'}
            <div class="w-min ml-2">
              <button on:click={disconnect} class="block w-4">
                {@html close}
              </button>
            </div>
          {/if}
        </div>
      </div>
    </div>

    {#if $recentErrors$}
      <button
        on:click={() => (expandRecentErrors = !expandRecentErrors)}
        class="mt-4 flex items-center text-sm cursor-pointer w-full"
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

    <!-- Connection Configuration UI -->
    {#if showConfiguration}
      <div transition:slide={{ duration: 250 }} class="w-full mt-4">
        <svelte:component
          this={typeToConfigurationComponent(type)}
          {configuration}
          on:updated={({ detail }) => handleConfigurationUpdate(detail)}
        />
      </div>
    {/if}

    {#if connectionError}
      <div class="mt-4">
        <Msg type="error" bind:message={connectionError} />
      </div>
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

    <div class="text-utility-error mt-4 w-full">
      <Button on:click={deleteConnection} warning text={$translate('app.labels.delete')}>
        <div slot="iconLeft" class="w-6 mr-2">{@html warning}</div>
      </Button>
    </div>
  </Modal>
{/if}
