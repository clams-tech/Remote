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

  let selectedWalletId: Wallet['id']
  let clbossInstalled = false

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
    clbossInstalled = plugins.some(plugin => plugin.name.includes('clboss'))
  })
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
      <h1>CLBOSS</h1>
      {#if clbossInstalled}
        <p>Lets go!</p>
      {:else}
        <Msg
          type="info"
          message="Clboss is not installed on your node. Learn how to install <a class='ml-1' target='_blank' rel='noopener noreferrer' href='https://github.com/ZmnSCPxj/clboss'>here</a>."
        />
      {/if}
    </div>
  </div>
</Section>
