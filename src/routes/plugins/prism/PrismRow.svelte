<script lang="ts">
  import type { PrismType } from '$lib/@types/plugins'
  import { formatDate } from '$lib/dates'
  import check from '$lib/icons/check'
  import close from '$lib/icons/close'
  import caret from '$lib/icons/caret.js'
  import { from } from 'rxjs'
  import { liveQuery } from 'dexie'
  import { db } from '$lib/db'
  import { translate } from '$lib/i18n/translations'

  export let prism: PrismType
  export let wallet: string

  const { prism_id, description, prism_members, timestamp } = prism

  const prismBindings$ = from(
    liveQuery(() =>
      db.prismBindings.toArray().then(prismBindings => {
        return prismBindings
      })
    )
  )

  let offerBound = false

  $: {
    $prismBindings$?.forEach(prismBinding => {
      if (prismBinding.prism_id === prism_id) {
        offerBound = true
      }
    })
  }
</script>

<a
  href={`/plugins/prism/${prism_id}?wallet=${wallet}`}
  class="w-full flex items-start justify-between no-underline hover:bg-neutral-800/80 bg-neutral-900 transition-all p-4 rounded h-[90px]"
>
  <div class="flex flex-col justify-center h-full">
    <div class="font-semibold">{$translate('app.labels.prism')}</div>
    <div class="w-full text-xs italic truncate whitespace-nowrap pr-1">{description}</div>
  </div>
  <div class="flex items-center ml-4 h-full">
    <div>
      <div class="w-full flex justify-end">
        <div
          class="flex items-center w-min text-xs font-semibold bg-neutral-800 mt-1 rounded-full px-3 h-5"
        >
          <div
            class="mr-1.5 w-4 h-4 leading-none flex items-center justify-center rounded-full bg-neutral-900 -mr-1"
          >
            {prism_members.length}
          </div>
          <div>
            {prism_members.length > 1
              ? `${$translate('app.labels.members')}`.toLowerCase()
              : `${$translate('app.labels.member')}`.toLowerCase()}
          </div>
        </div>
      </div>
      <div class="text-right w-full text-xs italic truncate whitespace-nowrap pr-1">
        {#await formatDate(timestamp, 'do MMM hh:mma') then formatted}
          <div class="text-[0.75em] font-semibold mt-1">{formatted}</div>
        {/await}
      </div>
      <div class="flex items-center justify-end text-xs font-semibold">
        {$translate('app.labels.offer_bound')}
        <div
          class="w-4 ml-1 border rounded-full"
          class:border-utility-success={offerBound}
          class:border-utility-error={!offerBound}
        >
          {@html offerBound ? check : close}
        </div>
      </div>
    </div>

    <div class="w-6 -rotate-90 -mr-1 ml-1">{@html caret}</div>
  </div>
</a>
