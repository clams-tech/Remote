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
  import { takeUntil } from 'rxjs'

  const route = 'wallets'
  const rowSize = 82
  const filters: Filter[] = getFilters(route)
  const sorters: Sorters = getSorters(route)
  const tags: string[] = getTags(route)

  let balances: Record<Connection['walletId'], number> = {}

  const sync = async (connection: Connection) => {
    const { walletId } = connection
    const balance = await getWalletBalance(walletId)

    balances = { ...balances, [walletId]: balance }
  }

  const button = {
    href: '/wallets/add',
    text: $translate('app.labels.add'),
    icon: plus
  }

  connections$.pipe(takeUntil(onDestroy$)).subscribe(connections => connections.forEach(sync))

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
