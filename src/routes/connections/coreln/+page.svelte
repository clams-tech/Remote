<script lang="ts">
  import Paragraph from '$lib/elements/Paragraph.svelte'
  import SectionHeading from '$lib/elements/SectionHeading.svelte'
  import { translate } from '$lib/i18n/translations.js'
  import keys from '$lib/icons/keys.js'
  import { writable } from 'svelte/store'
  import type { CoreLnConnectionInfo } from '$lib/@types/connections.js'
  import { WS_PROXY } from '$lib/constants.js'
  import Section from '$lib/elements/Section.svelte'
  import TextInput from '$lib/elements/TextInput.svelte'
  import { parseNodeAddress, validateParsedNodeAddress } from '$lib/utils'
  import { fade, slide } from 'svelte/transition'
  import check from '$lib/icons/check.js'
  import caret from '$lib/icons/caret.js'
  import AdvancedConnection from './AdvancedConnection.svelte'

  type ConnectStatus = 'idle' | 'connecting' | 'success' | 'fail'

  const translateBase = 'app.routes./connections/coreln'

  const connectionInfo = writable<CoreLnConnectionInfo['data']>({
    address: '',
    connection: {
      type: 'proxy',
      value: WS_PROXY
    },
    token: ''
  })

  let focusConnectionInput: () => void
  let validAddress = false
  let connectStatus: ConnectStatus = 'idle'
  let expandConnectionSettings = false

  $: if ($connectionInfo.address) {
    try {
      validAddress = validateParsedNodeAddress(parseNodeAddress($connectionInfo.address))
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

<Section>
  <SectionHeading icon={keys} />
  <!-- @TODO - Need to ensure docs route is created in docs site (/connections/coreln) -->
  <Paragraph>{@html $translate(`${translateBase}.introduction`)}</Paragraph>

  <!-- CONNECTION -->
  <div class="w-full mt-4">
    <div class="relative w-full flex flex-col">
      <TextInput
        name="address"
        type="text"
        label={$translate('app.inputs.node_connect.label')}
        invalid={$connectionInfo.address && !validAddress
          ? $translate('app.inputs.node_connect.invalid')
          : ''}
        placeholder={$translate('app.inputs.node_connect.placeholder')}
        bind:value={$connectionInfo.address}
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
      <AdvancedConnection bind:connection={$connectionInfo.connection} />
    </div>
  </div>

  <!-- AUTHENTICATION -->
  <div class="w-full mt-4">
    <!-- dsds -->
  </div>
</Section>
