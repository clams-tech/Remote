<script lang="ts">
  import type { ConnectionDetails } from '$lib/@types/connections.js'
  import { STORAGE_KEYS } from '$lib/constants.js'
  import { db } from '$lib/db.js'
  import { log, storage } from '$lib/services.js'
  import { liveQuery } from 'dexie'
  import Msg from './Msg.svelte'
  import { translate } from '$lib/i18n/translations.js'
  import Connection from './Connection.svelte'

  export let direction: 'send' | 'receive'
  export let label: string = $translate('app.labels.connection')
  export let selectedConnectionId: ConnectionDetails['id']

  const storedConnections$ = liveQuery(() => db.connections.toArray())

  try {
    const lastReceiveConnectionId = storage.get(
      direction === 'receive' ? STORAGE_KEYS.lastReceiveConnection : STORAGE_KEYS.lastSendConnection
    )

    if (lastReceiveConnectionId) {
      selectedConnectionId = lastReceiveConnectionId
    }
  } catch (error) {
    log.warn('Access to storage denied when trying to retrieve last received connection id')
  }

  $: if ($storedConnections$ && !selectedConnectionId) {
    selectConnection($storedConnections$[0].id)
  }

  const selectConnection = (id: ConnectionDetails['id']) => {
    selectedConnectionId = id

    try {
      storage.write(
        direction === 'receive'
          ? STORAGE_KEYS.lastReceiveConnection
          : STORAGE_KEYS.lastSendConnection,
        id
      )
    } catch (error) {
      log.warn('Access to storage denied when trying to write last received connection id')
    }
  }
</script>

{#if $storedConnections$}
  <div class="w-full">
    {#if !$storedConnections$.length}
      <div class="mt-4">
        <Msg closable={false} message={$translate('app.labels.add_connection')} type="info" />
      </div>
    {:else}
      {#if label}
        <div class="mb-2 text-neutral-300 font-semibold text-sm">
          {label}
        </div>
      {/if}

      <div
        class="flex w-full flex-wrap gap-2 px-2 py-4 border border-neutral-600 rounded bg-neutral-900"
      >
        {#each $storedConnections$ as connection}
          <Connection
            selected={selectedConnectionId === connection.id}
            on:click={() => selectConnection(connection.id)}
            data={connection}
          />
        {/each}
      </div>
    {/if}
  </div>
{/if}
