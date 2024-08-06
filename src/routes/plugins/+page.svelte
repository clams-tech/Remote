<script lang="ts">
  import type { Wallet } from '$lib/@types/wallets'
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
  import Spinner from '$lib/components/Spinner.svelte'

  let loading = true
  let selectedWalletId: Wallet['id']
  let clbossInstalled = false
  let clbossActive = false

  const availableWallets$ = combineLatest([wallets$, connections$]).pipe(
    map(([wallets, connections]) =>
      wallets.filter(({ id }) => {
        const connection = connections.find(({ walletId }) => walletId === id)
        return !!connection?.plugins?.list
      })
    )
  )

  $: connection = $connections$.find(({ walletId }) => walletId === selectedWalletId) as Connection

  $: if (connection) {
    loading = true
  }

  $: connection?.plugins?.list().then(plugins => {
    const clbossPlugin = plugins.find(plugin => plugin.name.includes('clboss'))

    if (clbossPlugin) {
      clbossInstalled = true
      clbossActive = clbossPlugin.active
      loading = false
    } else {
      clbossInstalled = false
      clbossActive = false
      loading = false
    }
  })
</script>

<svelte:head>
  <title>{$translate('app.routes./plugins.title')}</title>
</svelte:head>

<Section>
  <div class="flex items-center justify-between gap-x-4">
    <SectionHeading icon={terminal} />
  </div>
  <WalletSelector wallets={$availableWallets$} bind:selectedWalletId />
  <div class="w-full flex items-center mt-4">
    <div class="flex flex-col gap-4">
      {#if loading}
        <Spinner size="1.5em" />
      {:else}
        <a
          href={clbossInstalled
            ? `/plugins/clboss?wallet=${selectedWalletId}`
            : 'https://github.com/ZmnSCPxj/clboss'}
          target={clbossInstalled ? null : '_blank'}
          rel={clbossInstalled ? null : 'noopener noreferrer'}
          class="no-underline p-4 border rounded-lg flex flex-col justify-start mb-2 w-full"
        >
          <div class="flex items-center w-full justify-between gap-x-2 mb-2 flex-wrap gap-y-1">
            <div class="font-semibold">{$translate('app.labels.clboss')}</div>
          </div>

          <div class="text-sm">
            <div class="flex items-center">
              <div
                class:border-utility-error={!clbossInstalled}
                class:border-utility-success={clbossInstalled}
                class="w-4 mr-1 border rounded-full"
              >
                {@html clbossInstalled ? check : close}
              </div>
              {$translate('app.labels.installed')}
            </div>
            <div class="flex items-center">
              <div
                class:border-utility-error={!clbossActive}
                class:border-utility-success={clbossActive}
                class="w-4 mr-1 border rounded-full"
              >
                {@html clbossActive ? check : close}
              </div>
              {$translate('app.labels.active')}
            </div>
          </div>
        </a>
      {/if}
    </div>
  </div>
</Section>
