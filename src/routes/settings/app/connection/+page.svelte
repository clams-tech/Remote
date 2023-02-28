<script lang="ts">
  import { fade } from 'svelte/transition'
  import { goto } from '$app/navigation'
  import Slide from '$lib/elements/Slide.svelte'
  import ConnectionSettings from '$lib/components/ConnectionSettings.svelte'
  import { translate } from '$lib/i18n/translations'
  import Button from '$lib/elements/Button.svelte'
  import { auth$ } from '$lib/streams'
  import lightning from '$lib/lightning'
  import check from '$lib/icons/check'
  import { onDestroy } from 'svelte'
  import close from '$lib/icons/close'

  let saveConnectionSettings: ConnectionSettings['save']

  let connectStatus: 'connecting' | 'success' | 'fail' | 'idle'
  let statusTimeout: NodeJS.Timeout

  async function attemptConnect() {
    statusTimeout && clearTimeout(statusTimeout)
    saveConnectionSettings()
    connectStatus = 'connecting'

    const currentConnection = lightning.getLn()
    currentConnection.disconnect()

    try {
      const lnApi = lightning.getLn($auth$!)

      const connected = await lnApi.connection.connect(false)

      connectStatus = connected ? 'success' : 'fail'

      statusTimeout = setTimeout(() => {
        connectStatus = 'idle'
      }, 2000)
    } catch (error) {
      connectStatus = 'fail'
    }
  }

  onDestroy(() => {
    statusTimeout && clearTimeout(statusTimeout)
  })
</script>

<svelte:head>
  <title>{$translate('app.titles.settings_connection')}</title>
</svelte:head>

<Slide
  back={() => {
    goto('/settings/app')
  }}
  backText={$translate('app.titles.settings_app')}
>
  <section in:fade class="flex flex-col items-center justify-center w-full p-6 max-w-lg">
    <h1 class="text-lg w-full text-center my-6 font-bold">
      {$translate('app.titles.settings_connection')}
    </h1>

    <div>
      <ConnectionSettings bind:save={saveConnectionSettings} />

      <div class="mt-6">
        <Button on:click={attemptConnect} requesting={connectStatus === 'connecting'} text="Apply">
          <div
            slot="iconRight"
            class="overflow-hidden ml-2 transition-all {connectStatus === 'success' ||
            connectStatus === 'fail'
              ? 'w-6'
              : 'w-0'} {connectStatus === 'success'
              ? 'text-utility-success'
              : 'text-utility-error'}"
          >
            {@html connectStatus === 'success' ? check : close}
          </div>
        </Button>
      </div>
    </div>
  </section>
</Slide>
