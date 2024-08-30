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
  let prismInstalled = false
  let prismActive = false

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
    const prismPlugin = plugins.find(plugin => plugin.name.includes('bolt12-prism'))

    if (clbossPlugin) {
      clbossInstalled = true
      clbossActive = clbossPlugin.active
    } else {
      clbossInstalled = false
      clbossActive = false
    }

    if (prismPlugin) {
      prismInstalled = true
      prismActive = prismPlugin.active
    } else {
      prismInstalled = false
      prismActive = false
    }

    loading = false
  })

  $: plugins = [
    {
      label: $translate('app.labels.clboss'),
      installed: clbossInstalled,
      active: clbossActive,
      repo: 'https://github.com/ZmnSCPxj/clboss',
      route: '/plugins/clboss'
    },
    {
      label: $translate('app.labels.prism'),
      installed: prismInstalled,
      active: prismActive,
      repo: 'https://github.com/gudnuf/bolt12-prism',
      route: '/plugins/prism'
    }
  ]
</script>

<svelte:head>
  <title>{$translate('app.routes./plugins.title')}</title>
</svelte:head>

<Section>
  <div class="flex items-center justify-between gap-x-4">
    <SectionHeading icon={terminal} />
  </div>
  <WalletSelector wallets={$availableWallets$} bind:selectedWalletId />
  {#if $availableWallets$.length}
    <div class="w-full flex items-center mt-4">
      <div class="flex gap-4">
        {#if loading}
          <Spinner size="1.5em" />
        {:else}
          {#each plugins as { label, installed, active, repo, route }}
            <a
              href={installed ? `${route}?wallet=${selectedWalletId}` : repo}
              target={installed ? null : '_blank'}
              rel={installed ? null : 'noopener noreferrer'}
              class="no-underline p-4 border rounded-lg flex flex-col justify-start mb-2 w-full"
            >
              <div class="flex items-center w-full justify-between gap-x-2 mb-2 flex-wrap gap-y-1">
                <div class="font-semibold">{label}</div>
              </div>

              <div class="text-sm">
                <div class="flex items-center">
                  <div
                    class:border-utility-error={!installed}
                    class:border-utility-success={installed}
                    class="w-4 mr-1 border rounded-full"
                  >
                    {@html installed ? check : close}
                  </div>
                  {$translate('app.labels.installed')}
                </div>
                <div class="flex items-center">
                  <div
                    class:border-utility-error={!active}
                    class:border-utility-success={active}
                    class="w-4 mr-1 border rounded-full"
                  >
                    {@html active ? check : close}
                  </div>
                  {$translate('app.labels.active')}
                </div>
              </div>
            </a>
          {/each}
        {/if}
      </div>
    </div>
  {/if}
</Section>
