<script lang="ts">
  import Scanner from '$lib/components/Scanner.svelte'
  import Button from '$lib/elements/Button.svelte'
  import ErrorMsg from '$lib/elements/ErrorMsg.svelte'
  import TextInput from '$lib/elements/TextInput.svelte'
  import { translate } from '$lib/i18n/translations.js'
  import channels from '$lib/icons/channels.js'
  import scan from '$lib/icons/scan.js'
  import { slide } from 'svelte/transition'

  let address: string
  let channelSize: number
  let announce = true
  let feeRate: number

  let opening = false
  let errMsg = ''

  let showScanner = false

  async function openChannel() {
    // connect to peer
    // open channel
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

  <div class="w-full flex flex-col gap-y-4 mt-4">
    <TextInput
      type="number"
      name="rate"
      label={$translate('app.labels.fee_rate')}
      hint={$translate('app.labels.ppm')}
      bind:value={feeRate}
    />

    <div class="mt-2">
      <Button requesting={opening} on:click={openChannel} text={$translate('app.labels.open')} />
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
    <Scanner on:result={({ detail }) => handleScanResult(detail)} />
  </div>
{/if}
