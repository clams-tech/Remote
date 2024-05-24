<script lang="ts">
  import plus from '$lib/icons/plus.js'
  import { translate } from '$lib/i18n/translations.js'
  import type { Filter, Sorters } from '$lib/@types/common.js'
  import { getFilters, getSorters, getTags } from '$lib/filters.js'
  import type { Connection } from '$lib/wallets/interfaces.js'
  import ItemsList from '$lib/components/ItemsList.svelte'
  import SummaryRow from '$lib/components/SummaryRow.svelte'
  import BitcoinAmount from '$lib/components/BitcoinAmount.svelte'
  import WalletRow from './WalletRow.svelte'
  import { getWalletBalance } from '$lib/utils.js'
  import { slide } from 'svelte/transition'
  import { connections$, onDestroy$ } from '$lib/streams.js'
  import { filter, map, merge, switchMap, takeUntil } from 'rxjs'
  import { createWallet, fetchChannels, fetchUtxos } from '$lib/wallets/index.js'
  import { goto } from '$app/navigation'

  const route = 'wallets'
  const rowSize = 82
  const filters: Filter[] = getFilters(route)
  const sorters: Sorters = getSorters(route)
  const tags: string[] = getTags(route)

  let balances: Record<Connection['walletId'], number> = {}

  const sync = async (connection: Connection) => {
    await Promise.all([fetchUtxos(connection), fetchChannels(connection)])
  }

  const button = {
    onClick: async () => {
      const { id } = await createWallet()
      goto(`/wallets/${id}`)
    },
    href: '',
    text: $translate('app.labels.add'),
    icon: plus
  }

  connections$
    .pipe(
      takeUntil(onDestroy$),
      filter(connections => !!connections.length),
      switchMap(connections =>
        merge(
          ...connections.map(connection =>
            getWalletBalance(connection.walletId).pipe(
              map(balance => ({ [connection.walletId]: balance }))
            )
          )
        )
      )
    )
    .subscribe(balanceUpdate => {
      balances = { ...balances, ...balanceUpdate }
    })

  $: totalBalance = Object.values(balances).reduce((total, balance) => total + balance, 0)
</script>

<svelte:head>
  <title>{$translate(`app.routes./wallets.title`)}</title>
</svelte:head>

<ItemsList {filters} {sorters} {tags} {sync} {button} {route} {rowSize}>
  <div slot="summary">
    {#if totalBalance}
      <div in:slide>
        <SummaryRow>
          <div slot="label">{$translate('app.labels.total_balance')}:</div>
          <div slot="value">
            {#if typeof totalBalance === 'number'}
              <BitcoinAmount sats={totalBalance} />
            {/if}
          </div>
        </SummaryRow>
      </div>
    {/if}
  </div>

  <div slot="row" let:item>
    <WalletRow wallet={item} balance={balances[item.id]} />
  </div>
</ItemsList>
