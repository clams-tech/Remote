<script lang="ts">
  import { goto } from '$app/navigation'
  import Button from '$lib/components/Button.svelte'
  import TextInput from '$lib/components/TextInput.svelte'
  import Toggle from '$lib/components/Toggle.svelte'
  import { translate } from '$lib/i18n/translations.js'
  import channels from '$lib/icons/channels.js'
  import scan from '$lib/icons/scan.js'
  import { slide } from 'svelte/transition'
  import type { PageData } from './$types.js'
  import { validateNodeAddress } from '$lib/address.js'
  import Section from '$lib/components/Section.svelte'
  import SectionHeading from '$lib/components/SectionHeading.svelte'
  import Msg from '$lib/components/Msg.svelte'
  import plus from '$lib/icons/plus.js'

  export let data: PageData

  let address: string
  let channelSize: number = 0
  let announce = true

  let validAddress: boolean
  let opening = false
  let errMsg = ''

  let showScanner = false

  if (data.address) {
    address = data.address
  }

  $: validAddress = validateNodeAddress(address)

  async function openChannel() {
    // const { ip, publicKey, port } = parseNodeAddress(address)
    // const lnApi = lightning.getLn()
    // errMsg = ''
    // opening = true
    // try {
    //   // connect to peer
    //   await lnApi.connectPeer({ id: publicKey, host: ip, port })
    //   // open channel
    //   const { channelId } = await lnApi.openChannel({
    //     id: publicKey,
    //     amount: channelSize.toString(),
    //     announce
    //   })
    //   // get updated channel info
    //   await lightning.updateChannels()
    //   // route to channel detail page
    //   await goto(`/channels/${channelId}`)
    // } catch (error) {
    //   const { message } = error as { message: string }
    //   errMsg = message
    // } finally {
    //   opening = false
    // }
  }
</script>

<Section>
  <SectionHeading icon={channels} />

  <div class="w-full flex flex-col gap-y-4 mt-2">
    <TextInput
      name="address"
      type="textarea"
      rows={6}
      label={$translate('app.labels.peer_address')}
      invalid={address && !validAddress ? $translate('app.labels.address_invalid') : ''}
      placeholder={$translate('app.labels.address_placeholder')}
      bind:value={address}
    />

    <TextInput
      name="amount"
      type="number"
      rows={6}
      label={$translate('app.labels.channel_size')}
      msat={(channelSize * 1000).toString()}
      bind:value={channelSize}
    />

    <div class="text-sm">
      <Toggle bind:toggled={announce}>
        <div slot="left" class="mr-2">{$translate('app.labels.announce_channel')}</div>
      </Toggle>
    </div>

    <div class="mt-2 w-full flex justify-end">
      <div class="w-min">
        <Button
          disabled={!address || !validAddress || !channelSize}
          requesting={opening}
          on:click={openChannel}
          text={$translate('app.labels.open')}
        >
          <div slot="iconLeft" class="w-6 mr-1 -ml-2">{@html plus}</div>
        </Button>
      </div>
    </div>

    {#if errMsg}
      <div in:slide|local={{ duration: 250 }} class="mt-2">
        <Msg type="error" message={errMsg} />
      </div>
    {/if}
  </div>
</Section>
