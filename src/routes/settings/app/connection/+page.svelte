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
  import settingsOutline from '$lib/icons/settings-outline'

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
  <title>{$translate('app.titles./settings/connection')}</title>
</svelte:head>

<Slide
  back={() => {
    goto('/settings/app')
  }}
  backText={$translate('app.titles./settings/app')}
>
  <section
    in:fade|local={{ duration: 250 }}
    class="flex flex-col justify-center w-full p-4 max-w-lg"
  >
    <div class="flex items-center mb-6">
      <div class="w-10 mr-2">{@html settingsOutline}</div>
      <h1 class="text-4xl font-bold">
        {$translate('app.titles./settings/connection')}
      </h1>
    </div>

    <div class="w-full">
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
