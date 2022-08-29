<script lang="ts" context="module">
  export { load } from '$lib/utils'
</script>

<script lang="ts">
  import { goto } from '$app/navigation'
  import { fade } from 'svelte/transition'
  import Slide from '$lib/elements/Slide.svelte'
  import { customNotifications$, settings$ } from '$lib/streams'
  import Toggle from '$lib/elements/Toggle.svelte'
  import { translate } from '$lib/i18n/translations'
  import SummaryRow from '$lib/elements/SummaryRow.svelte'
  import { supportsNotifications } from '$lib/utils'

  let settings = [
    {
      label: $translate('app.labels.language'),
      route: '/settings/app/language',
      value: $settings$.language
    },
    {
      label: $translate('app.labels.local_currency'),
      route: '/settings/app/currency',
      value: $settings$.fiatDenomination.toLocaleUpperCase()
    },
    {
      label: $translate('app.labels.bitcoin_unit'),
      route: '/settings/app/unit',
      value: $settings$.bitcoinDenomination
    }
  ]

  async function requestNotifications() {
    try {
      if ($settings$.notifications && supportsNotifications()) {
        const permission = await Notification.requestPermission()

        if (permission === 'denied') {
          customNotifications$.next({
            type: 'error',
            heading: $translate('app.errors.permissions'),
            message: $translate('app.errors.permissions_notifications'),
            id: crypto.randomUUID()
          })
        }
      }
    } catch (error) {
      //
    }
  }
</script>

<svelte:head>
  <title>{$translate('app.titles.settings_app')}</title>
</svelte:head>

<Slide
  back={() => {
    goto('/settings')
  }}
>
  <section in:fade class="flex flex-col items-center justify-center w-full p-8 max-w-xl">
    <h1 class="text-lg w-full text-center mt-2 mb-6 font-bold">
      {$translate('app.titles.settings_app')}
    </h1>
    <div class="w-full">
      {#each settings as { label, route, value }}
        <a href={route}>
          <SummaryRow>
            <span slot="label">{label}</span>
            <p slot="value" class="">{value}</p>
          </SummaryRow>
        </a>
      {/each}
      <SummaryRow>
        <span slot="label">{$translate('app.labels.notifications')}</span>
        <Toggle
          handleChange={requestNotifications}
          slot="value"
          bind:toggled={$settings$.notifications}
        />
      </SummaryRow>
    </div>
  </section>
</Slide>
