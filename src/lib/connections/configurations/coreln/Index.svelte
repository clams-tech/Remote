<script lang="ts">
  import { translate } from '$lib/i18n/translations.js'
  import type { CoreLnConfiguration } from '$lib/@types/connections.js'
  import TextInput from '$lib/elements/TextInput.svelte'
  import { parseNodeAddress, validateParsedNodeAddress } from '$lib/utils'
  import { fade, slide } from 'svelte/transition'
  import check from '$lib/icons/check.js'
  import caret from '$lib/icons/caret.js'
  import AdvancedConnection from './AdvancedConnection.svelte'

  type ConnectStatus = 'idle' | 'connecting' | 'success' | 'fail'

  export let configuration: CoreLnConfiguration

  let focusConnectionInput: () => void
  let validAddress = false
  let connectStatus: ConnectStatus = 'idle'
  let expandConnectionSettings = false

  $: if (configuration.address) {
    try {
      validAddress = validateParsedNodeAddress(parseNodeAddress(configuration.address))
    } catch {
      validAddress = false
    }
  }

  function resetConnectStatus() {
    connectStatus = 'idle'
  }

  async function attemptConnect() {
    connectStatus = 'connecting'

    // try {
    //   const lnApi = lightning.getLn({
    //     address,
    //     token: ''
    //   })

    //   const connected = await lnApi.connection.connect(false)

    //   connectStatus = connected ? 'success' : 'fail'

    //   if (connectStatus === 'success') {
    //     sessionPublicKey = lnApi.connection.publicKey
    //     sessionPrivateKey = lnApi.connection.privateKey
    //     next()

    //     setTimeout(() => {
    //       focusRuneInput()
    //     }, 500)
    //   }
    // } catch (error) {
    //   connectStatus = 'fail'
    // }
  }
</script>

<div class="w-full">
  <!-- CONNECTION -->
  <div>
    <div class="relative w-full flex flex-col">
      <TextInput
        name="address"
        type="text"
        label={$translate('app.inputs.node_connect.label')}
        invalid={configuration.address && !validAddress
          ? $translate('app.inputs.node_connect.invalid')
          : ''}
        placeholder={$translate('app.inputs.node_connect.placeholder')}
        bind:value={configuration.address}
        bind:focus={focusConnectionInput}
        on:focus={resetConnectStatus}
      />

      <div
        in:slide|local={{ duration: 250 }}
        class="flex items-center text-sm absolute bottom-1 right-1"
      >
        {#if connectStatus === 'success'}
          <div class="flex items-center">
            <span class="text-utility-success">{$translate('app.inputs.add_rune.success')}</span>
            <div class="w-6 text-utility-success">
              {@html check}
            </div>
          </div>
        {:else if connectStatus === 'fail'}
          <div class="flex items-center">
            <span class="text-utility-error">{$translate('app.errors.node_connect')}</span>
            <div class="w-6 text-utility-error">
              {@html close}
            </div>
          </div>
        {/if}
      </div>
    </div>

    <button
      on:click={() => (expandConnectionSettings = !expandConnectionSettings)}
      class="mt-4 flex items-center text-sm cursor-pointer"
    >
      <div class:-rotate-90={!expandConnectionSettings} class="w-3 mr-1 transition-transform">
        {@html caret}
      </div>

      <span class="font-semibold underline">{$translate('app.labels.advanced')}</span>
    </button>

    <!-- ADVANCED SETTINGS -->
    <div
      in:fade|local={{ duration: 250 }}
      class:h-28={!!expandConnectionSettings}
      class="text-sm mt-2 pl-4 pr-[1px] flex flex-col items-start overflow-y-hidden h-0 transition-all"
    >
      <AdvancedConnection bind:connection={configuration.connection} />
    </div>
  </div>

  <!-- AUTHENTICATION -->
  <!-- <div class="w-full mt-4"> -->
  <!-- dsds -->
  <!-- </div> -->
</div>
