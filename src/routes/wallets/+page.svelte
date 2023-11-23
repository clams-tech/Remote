<script lang="ts">
  import plus from '$lib/icons/plus.js'
  import { translate } from '$lib/i18n/translations.js'
  import { fetchChannels } from '$lib/wallets/index.js'
  import type { Filter, Sorters } from '$lib/@types/common.js'
  import { getFilters, getSorters, getTags } from '$lib/filters.js'
  import type { Connection } from '$lib/wallets/interfaces.js'
  import ItemsList from '$lib/components/ItemsList.svelte'
  import SummaryRow from '$lib/components/SummaryRow.svelte'
  import BitcoinAmount from '$lib/components/BitcoinAmount.svelte'
  import WalletRow from './WalletRow.svelte'
  import { onDestroy$, wallets$ } from '$lib/streams.js'
  import { combineLatest, map, takeUntil } from 'rxjs'
  import { getWalletBalance } from '$lib/utils.js'

  const route = 'wallets'
  const rowSize = 82
  const filters: Filter[] = getFilters(route)
  const sorters: Sorters = getSorters(route)
  const tags: string[] = getTags(route)

  const sync = async (connection: Connection) => {
    await fetchChannels(connection)
  }

  const button = {
    href: '/wallets/add',
    text: $translate('app.labels.add'),
    icon: plus
  }

  let totalBalance: number

  $: if ($wallets$) {
    combineLatest($wallets$.map(wallet => getWalletBalance(wallet.id)))
      .pipe(
        takeUntil(onDestroy$),
        map(
          balances =>
            balances.reduce(
              (total, balance) => (balance ? (total || 0) + balance : total),
              0
            ) as number
        )
      )
      .subscribe(balance => (totalBalance = balance))
  }
</script>

<ItemsList {filters} {sorters} {tags} {sync} {button} {route} {rowSize}>
  <div slot="summary">
    {#if totalBalance}
      <div class=":mb-2">
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
    <WalletRow wallet={item} />
  </div>
</ItemsList>
