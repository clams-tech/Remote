<script lang="ts">
  import Scanner from '$lib/components/Scanner.svelte'
  import BackButton from '$lib/elements/BackButton.svelte'
  import Button from '$lib/elements/Button.svelte'
  import ErrorMsg from '$lib/elements/ErrorMsg.svelte'
  import TextInput from '$lib/elements/TextInput.svelte'
  import Toggle from '$lib/elements/Toggle.svelte'
  import { translate } from '$lib/i18n/translations.js'
  import channels from '$lib/icons/channels.js'
  import scan from '$lib/icons/scan.js'
  import lightning from '$lib/lightning.js'
  import { parseNodeAddress, validateParsedNodeAddress } from '$lib/utils.js'
  import { slide } from 'svelte/transition'

  let address: string
  let channelSize: number
  let announce = true

  let validAddress: boolean
  let opening = false
  let errMsg = ''

  let showScanner = false

  $: if (address) {
    try {
      validAddress = validateParsedNodeAddress(parseNodeAddress(address))
    } catch {
      validAddress = false
    }
  }

  async function openChannel() {
    const { ip, publicKey, port } = parseNodeAddress(address)
    const lnApi = lightning.getLn()

    errMsg = ''
    opening = true

    try {
      // connect to peer
      await lnApi.connectPeer({ id: publicKey, host: ip, port })

      // open channel
    } catch (error) {
      const { message } = error as { message: string }
      errMsg = message
    } finally {
      opening = false
    }
  }

  function handleScanResult(res: string) {
    address = res
    showScanner = false
  }
</script>

<svelte:head>
  <title>{$translate('app.titles./channels/open')}</title>
</svelte:head>

<section class="flex flex-col justify-center items-start w-full p-4 max-w-lg">
  <div class="flex items-center justify-between w-full">
    <div class="flex items-center">
      <div class="w-10 mr-2">{@html channels}</div>
      <h1 class="text-4xl font-bold">
        {$translate('app.titles./channels/open')}
      </h1>
    </div>

    <button on:click={() => (showScanner = true)} class="w-10">{@html scan}</button>
  </div>

  <div class="w-full flex flex-col gap-y-4 mt-6">
    <TextInput
      name="address"
      type="textarea"
      rows={6}
      label={$translate('app.labels.peer_address')}
      invalid={address && !validAddress ? $translate('app.inputs.node_connect.invalid') : ''}
      placeholder={$translate('app.inputs.node_connect.placeholder')}
      bind:value={address}
    />

    <TextInput
      name="amount"
      type="number"
      rows={6}
      label={$translate('app.labels.channel_size')}
      hint={$translate('app.labels.sats')}
      bind:value={channelSize}
    />

    <div class="text-sm">
      <Toggle label={$translate('app.labels.announce_channel')} bind:toggled={announce} />
    </div>

    <div class="mt-2">
      <Button
        disabled={!address || !validAddress || !channelSize}
        requesting={opening}
        on:click={openChannel}
        text={$translate('app.labels.open')}
      />
    </div>

    {#if errMsg}
      <div in:slide|local={{ duration: 250 }} class="mt-2">
        <ErrorMsg message={errMsg} />
      </div>
    {/if}
  </div>
</section>

{#if showScanner}
  <div class="absolute top-0 left-0 w-screen h-screen flex items-center justify-center">
    <BackButton on:click={() => (showScanner = false)} />
    <Scanner on:result={({ detail }) => handleScanResult(detail)} />
  </div>
{/if}
