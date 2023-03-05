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
  import caret from '$lib/icons/caret'
  import settingsOutline from '$lib/icons/settings-outline'

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
  <title>{$translate('app.titles./settings/app')}</title>
</svelte:head>

<Slide
  back={() => {
    goto('/settings')
  }}
  backText={$translate('app.titles./settings')}
>
  <section in:fade class="flex flex-col justify-center w-full p-6 max-w-lg">
    <div class="flex items-center mb-6">
      <div class="w-10 mr-2">{@html settingsOutline}</div>
      <h1 class="text-4xl font-bold">{$translate('app.titles./settings/app')}</h1>
    </div>
    <div class="w-full">
      {#each settings as { label, route, value }}
        <a href={route}>
          <SummaryRow>
            <span slot="label">{label}</span>
            <p slot="value" class="">{value}</p>
          </SummaryRow>
        </a>
      {/each}

      <a href={'/settings/app/connection'}>
        <SummaryRow>
          <span slot="label">{$translate('app.labels.connection')}</span>
          <div class="w-6 -rotate-90" slot="value">{@html caret}</div>
        </SummaryRow>
      </a>

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
