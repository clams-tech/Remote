<script lang="ts">
  import type { Filter } from '$lib/@types/common.js'
  import { getDateLocale } from '$lib/dates.js'
  import { translate } from '$lib/i18n/translations.js'
  import Msg from './Msg.svelte'
  import TextInput from './TextInput.svelte'
  import { DateInput, localeFromDateFnsLocale } from 'date-picker-svelte'

  export let filters: Filter[]

  // ensure date filters are Date type for the DateInput
  filters.forEach(filter => {
    if (filter.type === 'date-range') {
      if (typeof filter.values.gt === 'string') {
        filter.values.gt = new Date(filter.values.gt)
      }

      if (typeof filter.values.lt === 'string') {
        filter.values.lt = new Date(filter.values.lt)
      }
    }
  })
</script>

{#each filters as filter}
  {#if filter.type !== 'one-of' || filter.values.length}
    <div class="w-full">
      <div class="flex items-center mb-2">
        <label for={filter.key} class="font-semibold text-sm text-neutral-300">{filter.label}</label
        >

        {#if filter.type === 'exists'}
          <input
            type="checkbox"
            id={filter.key}
            name={filter.key}
            bind:checked={filter.applied}
            class="checked:bg-purple-400 hover:checked:bg-purple-500 rounded-md ml-2"
          />
        {/if}
      </div>

      {#if filter.type === 'one-of'}
        <div
          class="flex items-center flex-wrap gap-x-4 gap-y-2 bg-neutral-900 px-4 py-3 border border-neutral-600 rounded w-full"
        >
          {#each filter.values as value}
            <div class="flex items-center text-sm">
              <input
                name={value.label}
                id={value.label}
                type="checkbox"
                bind:checked={value.applied}
                class="checked:bg-purple-400 hover:checked:bg-purple-500 rounded-md"
              />
              <label class="ml-1 cursor-pointer" for={value.label}>{value.label}</label>
            </div>
          {/each}
        </div>
      {:else if filter.type === 'amount-range'}
        <div
          class="w-full flex flex-col bg-neutral-900 px-4 py-3 border border-neutral-600 rounded gap-y-2"
        >
          <div class="text-sm">
            <TextInput
              micro
              name="greater-than"
              label={$translate('app.labels.greater_than')}
              type="number"
              sats={filter.values.gt}
              bind:value={filter.values.gt}
            />
          </div>

          <div class="text-sm">
            <TextInput
              micro
              name="less-than"
              label={$translate('app.labels.less_than')}
              type="number"
              sats={filter.values.lt}
              bind:value={filter.values.lt}
            />
          </div>
        </div>
      {:else if filter.type === 'date-range'}
        <div
          class="w-full flex flex-col bg-neutral-900 px-4 py-3 border border-neutral-600 rounded gap-y-2"
        >
          {#await getDateLocale() then locale}
            <div class="text-sm w-1/2">
              <div class="font-semibold text-neutral-300 mb-2 text-xs">
                {$translate('app.labels.from')}
              </div>
              <DateInput
                bind:value={filter.values.gt}
                browseWithoutSelecting
                locale={localeFromDateFnsLocale(locale)}
                format="yyyy-MM-dd"
                placeholder={$translate('app.labels.select_date')}
                closeOnSelection
              />
            </div>

            <div class="text-sm w-1/2">
              <div class="font-semibold text-neutral-300 mb-2 text-xs">
                {$translate('app.labels.to')}
              </div>
              <DateInput
                bind:value={filter.values.lt}
                browseWithoutSelecting
                locale={localeFromDateFnsLocale(locale)}
                format="yyyy-MM-dd"
                placeholder={$translate('app.labels.select_date')}
                closeOnSelection
              />
            </div>
          {/await}
        </div>
      {:else if filter.type !== 'exists'}
        <Msg type="warning" message="Unknown filter type" />
      {/if}
    </div>
  {/if}
{/each}
