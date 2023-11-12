<script lang="ts">
  import plus from '$lib/icons/plus.js'
  import { translate } from '$lib/i18n/translations.js'
  import { fetchChannels } from '$lib/wallets/index.js'
  import type { Filter, Sorters } from '$lib/@types/common.js'
  import { getFilters, getSorters, getTags } from '$lib/filters.js'
  import type { Connection } from '$lib/wallets/interfaces.js'
  import ItemsList from '$lib/components/ItemsList.svelte'
  import ChannelRow from './ChannelRow.svelte'
  import type { Channel } from '$lib/@types/channels.js'
  import SummaryRow from '$lib/components/SummaryRow.svelte'
  import BitcoinAmount from '$lib/components/BitcoinAmount.svelte'

  const route = 'channels'
  const rowSize = 102.25
  const filters: Filter[] = getFilters(route)
  const sorters: Sorters = getSorters(route)
  const tags: string[] = getTags(route)
  const maxAmountChannelsToFetch = 500

  const sync = async (connection: Connection) => {
    await fetchChannels(connection)
  }

  const button = {
    href: '/channels/open',
    text: $translate('app.labels.open'),
    icon: plus
  }

  const dedupe = async (channels: Channel[]): Promise<Channel[]> => {
    return Array.from(
      channels
        .reduce((acc, channel) => {
          const channelWithSameId = acc.get(channel.id)

          // if duplicates (we are both parties to channel), keep the local opener copy
          if (!channelWithSameId || channelWithSameId.opener !== 'local') {
            acc.set(channel.id, channel)
          }

          return acc
        }, new Map<string, Channel>())
        .values()
    )
  }

  let channels: Channel[] = []

  $: totals = channels.length
    ? channels.reduce(
        (acc, { balanceLocal, reserveLocal, balanceRemote, reserveRemote, status }) => {
          if (status === 'active') {
            acc.sendable = acc.sendable + balanceLocal - reserveLocal
            acc.receivable = acc.receivable + balanceRemote - reserveRemote
          }

          if (status !== 'closed' && status !== 'force_closed') {
            acc.channels += 1
          }

          return acc
        },
        { sendable: 0, receivable: 0, channels: 0 }
      )
    : null
</script>

<ItemsList
  {filters}
  {sorters}
  {tags}
  {sync}
  {button}
  {route}
  {rowSize}
  {dedupe}
  bind:items={channels}
  limit={maxAmountChannelsToFetch}
>
  <div slot="summary">
    {#if totals}
      <div class="w-full mb-2">
        <SummaryRow>
          <div slot="label">{$translate('app.labels.active')}:</div>
          <div slot="value">{totals.channels} channels</div>
        </SummaryRow>

        <SummaryRow>
          <div slot="label">{$translate('app.labels.sendable')}:</div>
          <div slot="value">
            <BitcoinAmount sats={totals.sendable < 0 ? 0 : totals.sendable} />
          </div>
        </SummaryRow>

        <SummaryRow>
          <div slot="label">{$translate('app.labels.receivable')}:</div>
          <div slot="value">
            <BitcoinAmount sats={totals.receivable < 0 ? 0 : totals.receivable} />
          </div>
        </SummaryRow>
      </div>
    {/if}
  </div>

  <div slot="row" let:item>
    <ChannelRow channel={item} />
  </div>
</ItemsList>
