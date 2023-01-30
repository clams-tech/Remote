<script lang="ts">
  import { fade } from 'svelte/transition'
  import { WS_PROXY } from '$lib/constants'
  import TextInput from '$lib/elements/TextInput.svelte'
  import { settings$ } from '$lib/streams'
  import type { LnWebSocketOptions } from 'lnmessage/dist/types'
  import { onDestroy } from 'svelte'
  import type { Settings } from '$lib/types'
  import { translate } from '$lib/i18n/translations'

  export let invalid = false

  export const save = () => {
    const update: Partial<Settings> =
      advancedConnectOption === 'customProxy'
        ? { wsProxy: !invalid ? customProxyUrl : WS_PROXY, directConnection: undefined }
        : advancedConnectOption === 'directConnection'
        ? { directConnection: connectionProtocol }
        : { wsProxy: WS_PROXY, directConnection: undefined }

    settings$.next({ ...$settings$, ...update })
  }

  $: if (
    advancedConnectOption === 'customProxy' &&
    (!!customProxyUrlError || !customProxyUrl || customProxyUrlAwaitingValidation)
  ) {
    invalid = true
  } else {
    invalid = false
  }

  let advancedConnectOption: 'default' | 'customProxy' | 'directConnection' =
    $settings$.directConnection
      ? 'directConnection'
      : $settings$.wsProxy !== WS_PROXY
      ? 'customProxy'
      : 'default'

  let customProxyUrl = $settings$.wsProxy || ''
  let customProxyInput: TextInput
  let customProxyUrlError = ''
  let customProxyUrlAwaitingValidation = false
  let connectionProtocol: LnWebSocketOptions['wsProtocol'] = $settings$.directConnection || 'wss:'

  $: if (advancedConnectOption === 'customProxy') {
    setTimeout(() => {
      customProxyInput && customProxyInput.focus()
    }, 10)
  }

  let urlValidationTimeout: NodeJS.Timeout

  function validateCustomProxy() {
    customProxyUrlError = ''
    urlValidationTimeout && clearTimeout(urlValidationTimeout)
    customProxyUrlAwaitingValidation = true

    urlValidationTimeout = setTimeout(() => {
      try {
        const url = new URL(customProxyUrl)

        if (url.protocol !== 'ws:' && url.protocol !== 'wss:') {
          customProxyUrlError = 'URL protocol must be ws: or wss:'
          return
        }
      } catch (error) {
        customProxyUrlError = 'Not a valid WS URL'
      }

      customProxyUrlAwaitingValidation = false
    }, 750)
  }

  onDestroy(() => {
    urlValidationTimeout && clearTimeout(urlValidationTimeout)
  })
</script>

<div>
  <div class="flex items-center border rounded-md">
    <label
      class="flex items-center px-4 py-2 rounded cursor-pointer"
      class:bg-neutral-200={advancedConnectOption === 'default'}
      class:dark:bg-neutral-700={advancedConnectOption === 'default'}
    >
      <input
        type="radio"
        class="appearance-none"
        bind:group={advancedConnectOption}
        value="default"
      />
      <span class="ml-1">{$translate('app.labels.app_proxy')}</span>
    </label>

    <label
      class="flex items-center px-4 py-2 rounded cursor-pointer"
      class:bg-neutral-200={advancedConnectOption === 'customProxy'}
      class:dark:bg-neutral-700={advancedConnectOption === 'customProxy'}
    >
      <input
        type="radio"
        class="appearance-none"
        bind:group={advancedConnectOption}
        value="customProxy"
      />
      <span class="ml-1">{$translate('app.labels.custom_proxy')}</span>
    </label>

    <label
      class="flex items-center px-4 py-2 rounded cursor-pointer"
      class:bg-neutral-200={advancedConnectOption === 'directConnection'}
      class:dark:bg-neutral-700={advancedConnectOption === 'directConnection'}
    >
      <input
        type="radio"
        class="appearance-none"
        bind:group={advancedConnectOption}
        value="directConnection"
      />
      <span class="ml-1">{$translate('app.labels.direct_connection')}</span>
    </label>
  </div>

  {#if advancedConnectOption === 'customProxy'}
    <div in:fade class="mt-2 w-full">
      <TextInput
        on:input={validateCustomProxy}
        bind:this={customProxyInput}
        bind:value={customProxyUrl}
        name={advancedConnectOption}
        placeholder={WS_PROXY}
        invalid={customProxyUrlError}
        micro
      />
    </div>
  {:else if advancedConnectOption === 'directConnection'}
    <div in:fade class="mt-2">
      <div
        class="flex items-center px-3 py-[9px] ring-2 ring-purple-500 border border-neutral-200 dark:border-neutral-600 rounded"
      >
        <label class="flex items-center cursor-pointer">
          <input type="radio" bind:group={connectionProtocol} value="wss:" />
          <span class="ml-1">wss</span>
        </label>

        <label class="flex items-center ml-4 cursor-pointer">
          <input type="radio" bind:group={connectionProtocol} value="ws:" />
          <span class="ml-1">ws</span>
        </label>
      </div>
    </div>
  {:else}
    <div in:fade class="mt-2 w-full">
      <TextInput value={WS_PROXY} name={advancedConnectOption} micro readonly />
    </div>
  {/if}
</div>
