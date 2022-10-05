<script lang="ts">
  import { goto } from '$app/navigation'
  import { fade } from 'svelte/transition'
  import { skip } from 'rxjs/operators'
  import Slide from '$lib/elements/Slide.svelte'
  import Caret from '$lib/icons/Caret.svelte'
  import { auth$, funds$, modal$, nodeInfo$, payments$, pin$, settings$ } from '$lib/streams'
  import { Modals, type Settings } from '$lib/types'
  import Toggle from '$lib/elements/Toggle.svelte'
  import { translate } from '$lib/i18n/translations'
  import Button from '$lib/elements/Button.svelte'
  import SummaryRow from '$lib/elements/SummaryRow.svelte'
  import { encryptAllData, resetApp } from '$lib/utils'
  import { firstValueFrom } from 'rxjs'

  let version = __APP_VERSION__

  const toggle = (key: keyof Settings) => {
    const currentSettings = settings$.value

    const toggled = !currentSettings[key]

    settings$.next({
      ...currentSettings,
      [key]: toggled
    })

    return toggled
  }

  $: settings = [
    { label: $translate('app.labels.app'), route: '/settings/app' },
    { label: $translate('app.labels.help_and_support'), route: 'settings/help' },
    {
      label: $translate('app.labels.encrypt'),
      toggle: handleEncryptToggle,
      toggled: $settings$.encrypt
    },
    {
      label: $translate('app.labels.dark_mode'),
      toggle: handleDarkModeToggle,
      toggled: $settings$.darkmode
    }
  ]

  async function handleEncryptToggle() {
    const toggled = toggle('encrypt')

    if (toggled) {
      // trigger modal
      modal$.next(Modals.pinEntry)

      // wait for pin entry
      const pin = await firstValueFrom(pin$.pipe(skip(1)))

      if (pin) {
        encryptAllData(pin)
      } else {
        // no pin so can't encrypt, toggle back to false
        toggle('encrypt')
      }
    } else {
      // turning off encryption, so store data unencrypted
      auth$.next($auth$)
      nodeInfo$.next($nodeInfo$)
      funds$.next($funds$)
      payments$.next($payments$)
    }
  }

  function handleDarkModeToggle() {
    const toggled = toggle('darkmode')
    document.documentElement.classList[toggled ? 'add' : 'remove']('dark')
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
      {#each settings as { label, route, toggle, toggled }}
        {#if toggle}
          <div class="cursor-pointer" on:click={toggle}>
            <SummaryRow>
              <span slot="label">{label}</span>
              <Toggle slot="value" {toggled} handleChange={toggle} />
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
      <Button text={$translate('app.buttons.reset_app')} on:click={resetApp} />
    </div>
  </section>
</Slide>
