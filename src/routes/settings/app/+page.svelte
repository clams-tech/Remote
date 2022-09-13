<script lang="ts">
  import { goto } from '$app/navigation'
  import { fade } from 'svelte/transition'
  import Slide from '$lib/elements/Slide.svelte'
  import { settings$ } from '$lib/streams'
  import Toggle from '$lib/elements/Toggle.svelte'
  import { translate } from '$lib/i18n/translations'
  import SummaryRow from '$lib/elements/SummaryRow.svelte'
  import { supportsNotifications } from '$lib/utils'
  import ErrorMsg from '$lib/elements/ErrorMsg.svelte'

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

  let errorMsg = ''

  async function requestNotifications() {
    try {
      if ($settings$.notifications && supportsNotifications()) {
        const permission = await Notification.requestPermission()

        if (permission === 'denied') {
          errorMsg = $translate('app.errors.permissions_notifications')
        }
      }
    } catch (error) {
      errorMsg = $translate('app.errors.permissions_notifications')
    }
  }

  function toggleNotifications() {
    const currentSettings = settings$.getValue()
    settings$.next({ ...currentSettings, notifications: !currentSettings.notifications })
    requestNotifications()
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
  <section in:fade class="flex flex-col items-center justify-center w-full p-6 max-w-xl">
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

      <div class="cursor-pointer" on:click={toggleNotifications}>
        <SummaryRow>
          <span slot="label">{$translate('app.labels.notifications')}</span>
          <Toggle
            handleChange={requestNotifications}
            slot="value"
            bind:toggled={$settings$.notifications}
          />
        </SummaryRow>
      </div>
    </div>
  </section>
</Slide>

<div class="absolute bottom-4">
  <ErrorMsg bind:message={errorMsg} />
</div>
