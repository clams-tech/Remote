<script lang="ts" context="module">
  export { load } from '$lib/utils'
</script>

<script lang="ts">
  import { goto } from '$app/navigation'
  import { fade } from 'svelte/transition'
  import Slide from '$lib/elements/Slide.svelte'
  import { Language } from '$lib/types'
  import { settings$ } from '$lib/streams'
  import Check from '$lib/icons/Check.svelte'
  import { translate } from '$lib/i18n/translations'
  import SummaryRow from '$lib/elements/SummaryRow.svelte'

  function setLanguage(lang: Language) {
    const currentSettings = settings$.value

    settings$.next({
      ...currentSettings,
      language: lang
    })
  }
</script>

<svelte:head>
  <title>{$translate('app.titles.settings_language')}</title>
</svelte:head>

<Slide
  back={() => {
    goto('/settings/app')
  }}
>
  <section in:fade class="flex flex-col items-center justify-center w-full p-6 max-w-xl">
    <h1 class="text-lg w-full text-center mt-2 mb-6 font-bold">
      {$translate('app.titles.settings_language')}
    </h1>
    <div class="w-full h-full overflow-y-auto overflow-x-hidden">
      {#each Object.values(Language) as val}
        <div on:click={() => setLanguage(val)} class="cursor-pointer">
          <SummaryRow>
            <span slot="label">{val}</span>

            <div class="w-6" slot="value">
              {#if $settings$.language === val}
                <Check />
              {/if}
            </div>
          </SummaryRow>
        </div>
      {/each}
    </div>
  </section>
</Slide>
