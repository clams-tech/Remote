<script lang="ts">
  import type { Wallet } from '$lib/@types/wallets'
  import Msg from '$lib/components/Msg.svelte'
  import Section from '$lib/components/Section.svelte'
  import SectionHeading from '$lib/components/SectionHeading.svelte'
  import WalletSelector from '$lib/components/WalletSelector.svelte'
  import { translate } from '$lib/i18n/translations'
  import terminal from '$lib/icons/terminal'
  import { connections$, wallets$ } from '$lib/streams.js'
  import type { Connection } from '$lib/wallets/interfaces'
  import { combineLatest, map } from 'rxjs'
  import check from '$lib/icons/check'
  import close from '$lib/icons/close'

  let loading = true
  let selectedWalletId: Wallet['id']
  let clbossInstalled = false
  let clbossActive = false
  let clbossStatus = null

  const availableWallets$ = combineLatest([wallets$, connections$]).pipe(
    map(([wallets, connections]) =>
      wallets.filter(({ id }) => {
        const connection = connections.find(({ walletId }) => walletId === id)
        return !!connection?.plugins?.get
      })
    )
  )

  $: connection = connections$.value.find(
    ({ walletId }) => walletId === selectedWalletId
  ) as Connection

  $: connection?.plugins?.get().then(plugins => {
    const clbossPlugin = plugins.find(plugin => plugin.name.includes('clboss'))

    if (clbossPlugin) {
      clbossInstalled = true
      clbossActive = clbossPlugin.active
      // TODO - move this logic to the clboss UI route
      connection?.clboss?.get().then(response => {
        clbossStatus = response
      })
    } else {
      clbossInstalled = false
      clbossActive = false
    }
    loading = false
  })

  // TODO
  // check if we can reset CLN
  // list all of the options they can change for clboss
  // decipher between changes that can be made that require a CLN restart and those that don't
</script>

<svelte:head>
  <title>{$translate('app.routes./plugins.title')}</title>
</svelte:head>

<Section>
  <WalletSelector wallets={$availableWallets$} bind:selectedWalletId />
  <div class="flex items-center justify-between gap-x-4">
    <SectionHeading icon={terminal} />
  </div>
  <div class="w-full flex items-center mt-4">
    <div class="flex flex-col gap-4">
      {#if !loading}
        <div>
          <h1>CLBOSS</h1>
          <div class="flex items-center">
            <div
              class:border-utility-error={!clbossInstalled}
              class:border-utility-success={clbossInstalled}
              class="w-4 mr-1 border rounded-full"
            >
              {@html clbossInstalled ? check : close}
            </div>
            installed
          </div>
          <div class="flex items-center">
            <div
              class:border-utility-error={!clbossInstalled}
              class:border-utility-success={clbossInstalled}
              class="w-4 mr-1 border rounded-full"
            >
              {@html clbossActive ? check : close}
            </div>
            active
          </div>
          {#if clbossInstalled}
            <a href={`/plugins/clboss?wallet=${selectedWalletId}`}>Configure</a>
          {:else}
            <a target="_blank" rel="noopener noreferrer" href="https://github.com/ZmnSCPxj/clboss"
              >Learn more</a
            >
          {/if}
        </div>
      {/if}
    </div>
  </div>
</Section>
