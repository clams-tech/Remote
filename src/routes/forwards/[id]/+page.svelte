<script lang="ts">
  import Spinner from '$lib/components/Spinner.svelte'
  import { translate } from '$lib/i18n/translations'
  import type { PageData } from './$types'
  import { db } from '$lib/db/index.js'
  import { liveQuery } from 'dexie'
  import { truncateValue } from '$lib/utils.js'
  import Msg from '$lib/components/Msg.svelte'
  import Section from '$lib/components/Section.svelte'
  import SummaryRow from '$lib/components/SummaryRow.svelte'
  import BitcoinAmount from '$lib/components/BitcoinAmount.svelte'
  import caret from '$lib/icons/caret.js'
  import SectionHeading from '$lib/components/SectionHeading.svelte'
  import forward from '$lib/icons/forward.js'
  import { formatDate } from '$lib/dates.js'
  import { differenceInMilliseconds } from 'date-fns'

  export let data: PageData

  let forwardNotFound: boolean

  const forward$ = liveQuery(() =>
    db.forwards.get(data.id).then(forward => {
      forwardNotFound = !forward
      return forward
    })
  )
</script>

<svelte:head>
  <title>
    {$translate('app.routes./forward.title')}
  </title>
</svelte:head>

<Section>
  {#if forwardNotFound}
    <div class="w-full mt-4">
      <Msg message={$translate('app.errors.could_not_find_forward')} type="error" />
    </div>
  {:else if !$forward$}
    <div class="mt-4">
      <Spinner />
    </div>
  {:else}
    {@const {
      shortIdIn,
      shortIdOut,
      walletId,
      fee,
      in: amountIn,
      out: amountOut,
      status,
      createdAt,
      completedAt
    } = $forward$}
    <div class="w-full">
      <SectionHeading text={$translate('app.routes./forward.title')} icon={forward} />

      <SummaryRow>
        <div slot="label">{$translate('app.labels.status')}:</div>
        <div
          class:text-utility-success={status === 'settled'}
          class:utility-pending={status === 'offered'}
          class:text-utility-error={status === 'failed' || status === 'local_failed'}
          slot="value"
        >
          {$translate(`app.labels.${status}`)}
        </div>
      </SummaryRow>

      <SummaryRow>
        <div slot="label">{$translate('app.labels.wallet')}:</div>
        <a slot="value" href={`/wallets/${walletId}`} class="flex items-center no-underline">
          {#await db.wallets.get(walletId) then wallet}
            {wallet?.label || truncateValue(walletId)}
          {/await}

          <div class="w-4 -rotate-90">{@html caret}</div>
        </a>
      </SummaryRow>

      <SummaryRow>
        <div slot="label">{$translate('app.labels.in_amount')}:</div>
        <div slot="value">
          <BitcoinAmount sats={amountIn} />
        </div>
      </SummaryRow>

      <SummaryRow>
        <div slot="label">{$translate('app.labels.out_amount')}:</div>
        <div slot="value">
          <BitcoinAmount sats={amountOut} />
        </div>
      </SummaryRow>

      <SummaryRow>
        <div slot="label">{$translate('app.labels.fee')}</div>
        <div slot="value">
          <BitcoinAmount sats={fee} />
        </div>
      </SummaryRow>

      {#if completedAt}
        <SummaryRow>
          <div slot="label">{$translate('app.labels.completed_at')}</div>
          <div slot="value">
            {#await formatDate(completedAt, 'hh:mm a') then formatted}
              {formatted}
            {/await}
          </div>
        </SummaryRow>

        <SummaryRow>
          <div slot="label">{$translate('app.labels.process_time')}</div>
          <div slot="value">
            {#await differenceInMilliseconds(completedAt, createdAt) then formatted}
              {formatted} ms
            {/await}
          </div>
        </SummaryRow>
      {/if}

      <SummaryRow>
        <div slot="label">{$translate('app.labels.in_channel')}:</div>
        <div class="flex items-center" slot="value">
          {#await db.channels.where({ shortId: shortIdIn }).first() then inChannel}
            {#if inChannel}
              <a href={`/channels/${inChannel.id}`} class="no-underline"
                >{inChannel?.peerAlias ||
                  truncateValue(inChannel?.peerId || $translate('app.labels.unknown'))}</a
              >
              <div class="w-4 -rotate-90">{@html caret}</div>
            {:else}
              {$translate('app.labels.unknown')}
            {/if}
          {/await}
        </div>
      </SummaryRow>

      <SummaryRow>
        <div slot="label">{$translate('app.labels.out_channel')}:</div>
        <div class="flex items-center" slot="value">
          {#await db.channels.where({ shortId: shortIdOut }).first() then outChannel}
            {#if outChannel}
              <a href={`/channels/${outChannel.id}`} class="no-underline"
                >{outChannel?.peerAlias ||
                  truncateValue(outChannel?.peerId || $translate('app.labels.unknown'))}</a
              >
              <div class="w-4 -rotate-90">{@html caret}</div>
            {:else}
              {$translate('app.labels.unknown')}
            {/if}
          {/await}
        </div>
      </SummaryRow>
    </div>
  {/if}
</Section>
