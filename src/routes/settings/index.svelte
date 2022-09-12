<script lang="ts" context="module">
  export { load } from '$lib/utils'
</script>

<script lang="ts">
  import { goto } from '$app/navigation'
  import { fade } from 'svelte/transition'
  import Slide from '$lib/elements/Slide.svelte'
  import Caret from '$lib/icons/Caret.svelte'
  import { settings$ } from '$lib/streams'
  import Toggle from '$lib/elements/Toggle.svelte'
  import { translate } from '$lib/i18n/translations'
  import Button from '$lib/elements/Button.svelte'
  import { CREDENTIALS_STORAGE_KEY } from '$lib/constants'
  import SummaryRow from '$lib/elements/SummaryRow.svelte'

  let version = __APP_VERSION__

  let settings = [
    { label: $translate('app.labels.app'), route: '/settings/app' },
    { label: $translate('app.labels.help_and_support'), route: 'settings/help' },
    { label: $translate('app.labels.dark_mode') }
  ]

  const toggleDarkmode = () => {
    const currentSettings = settings$.value

    settings$.next({
      ...currentSettings,
      darkmode: !currentSettings.darkmode
    })
  }
</script>

<svelte:head>
  <title>{$translate('app.titles.settings')}</title>
</svelte:head>

<Slide
  back={() => {
    goto('/')
  }}
>
  <section in:fade class="flex flex-col items-center justify-center w-full p-6 max-w-xl">
    <h1 class="text-lg w-full text-center mt-2 mb-6 font-bold">
      {$translate('app.titles.settings')}
    </h1>
    <div class="w-full">
      {#each settings as { label, route }}
        {#if label === 'Dark Mode'}
          <div class="cursor-pointer" on:click={toggleDarkmode}>
            <SummaryRow>
              <span slot="label">{label}</span>
              <Toggle slot="value" toggled={$settings$.darkmode} handleChange={toggleDarkmode} />
            </SummaryRow>
          </div>
        {:else}
          <a href={route}>
            <SummaryRow>
              <span slot="label">{label}</span>
              <div class="w-6" slot="value"><Caret direction="right" /></div>
            </SummaryRow>
          </a>
        {/if}
      {/each}

      <SummaryRow>
        <span slot="label">{$translate('app.labels.version')}</span>
        <span slot="value">{version}</span>
      </SummaryRow>
    </div>
    <div class="w-full mt-6">
      <Button
        text={$translate('app.buttons.log_out')}
        on:click={() => {
          localStorage.removeItem(CREDENTIALS_STORAGE_KEY)
          window.location.reload()
        }}
      />
    </div>
  </section>
</Slide>
