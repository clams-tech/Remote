<script lang="ts">
  import { fade } from 'svelte/transition'
  import { WS_PROXY } from '$lib/constants'
  import TextInput from '$lib/components/TextInput.svelte'
  import { translate } from '$lib/i18n/translations'
  import type { CoreLnConfiguration } from '$lib/@types/wallets.js'

  export let invalid = false
  export let connection: CoreLnConfiguration['connection']

  let advancedConnectOption: 'default' | 'customProxy' | 'directConnection' =
    connection.type === 'direct'
      ? 'directConnection'
      : connection.value === WS_PROXY
      ? 'default'
      : 'customProxy'

  let customProxyInput: TextInput
  let customProxyUrlError = ''
  let customProxyUrlAwaitingValidation = false

  function handleConnectionOptionChange() {
    if (advancedConnectOption === 'customProxy') {
      connection = { type: 'proxy', value: '' }

      setTimeout(() => {
        customProxyInput && customProxyInput.focus()
      }, 10)

      if (!!customProxyUrlError || !connection.value || customProxyUrlAwaitingValidation) {
        invalid = true
      } else {
        invalid = false
      }
    } else if (advancedConnectOption === 'directConnection') {
      connection = { type: 'direct', value: connection.value === 'ws:' ? connection.value : 'wss:' }
    } else {
      connection = { type: 'proxy', value: WS_PROXY }
    }
  }

  $: if (connection.type === 'proxy' && connection.value) {
    validateCustomProxy()
  }

  $: if (advancedConnectOption) {
    handleConnectionOptionChange()
  }

  function validateCustomProxy() {
    customProxyUrlError = ''

    try {
      const url = new URL(connection.value)

      if (url.protocol !== 'ws:' && url.protocol !== 'wss:') {
        customProxyUrlError = 'URL protocol must be ws: or wss:'
        return
      }
    } catch (error) {
      customProxyUrlError = 'Not a valid WS URL'
    }

    customProxyUrlAwaitingValidation = false
  }
</script>

<div class="w-full text-sm">
  <div class="flex border rounded-md">
    <label
      class="flex items-center justify-center px-2 py-2 rounded-md cursor-pointer w-1/3"
      class:bg-neutral-700={advancedConnectOption === 'default'}
    >
      <input
        type="radio"
        class="appearance-none hidden"
        bind:group={advancedConnectOption}
        value="default"
      />
      <span class="text-center">{$translate('app.labels.app_proxy')}</span>
    </label>

    <label
      class="flex items-center justify-center px-2 py-2 rounded cursor-pointer w-1/3"
      class:bg-neutral-700={advancedConnectOption === 'customProxy'}
    >
      <input
        type="radio"
        class="appearance-none hidden"
        bind:group={advancedConnectOption}
        value="customProxy"
      />
      <span class="text-center">{$translate('app.labels.custom_proxy')}</span>
    </label>

    <label
      class="flex items-center justify-center px-2 py-2 rounded cursor-pointer w-1/3"
      class:bg-neutral-700={advancedConnectOption === 'directConnection'}
    >
      <input
        type="radio"
        class="appearance-none hidden"
        bind:group={advancedConnectOption}
        value="directConnection"
      />
      <span class="text-center">{$translate('app.labels.direct_connection')}</span>
    </label>
  </div>

  {#if advancedConnectOption === 'customProxy'}
    <div in:fade={{ duration: 250 }} class="mt-2">
      <TextInput
        bind:this={customProxyInput}
        bind:value={connection.value}
        name={advancedConnectOption}
        placeholder={WS_PROXY}
        invalid={customProxyUrlError}
      />
    </div>
  {:else if advancedConnectOption === 'directConnection'}
    <div in:fade={{ duration: 250 }} class="mt-2">
      <div
        class="flex items-center px-3 py-3 ring-2 ring-purple-500 border border-neutral-600 rounded"
      >
        <label class="flex items-center cursor-pointer">
          <input type="radio" bind:group={connection.value} value="wss:" />
          <span class="ml-1">wss</span>
        </label>

        <label class="flex items-center ml-4 cursor-pointer">
          <input type="radio" bind:group={connection.value} value="ws:" />
          <span class="ml-1">ws</span>
        </label>
      </div>
    </div>
  {:else}
    <div in:fade={{ duration: 250 }} class="mt-2 w-full">
      <TextInput value={WS_PROXY} name={advancedConnectOption} readonly />
    </div>
  {/if}
</div>
