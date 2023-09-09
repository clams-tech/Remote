<script lang="ts">
  import { settings$ } from '$lib/streams'
  import Toggle from '$lib/components/Toggle.svelte'
  import { translate } from '$lib/i18n/translations'
  import SummaryRow from '$lib/components/SummaryRow.svelte'
  import settingsOutline from '$lib/icons/settings-outline'
  import Section from '$lib/components/Section.svelte'
  import SectionHeading from '$lib/components/SectionHeading.svelte'
  import { notification } from '$lib/services.js'
  import { fade, slide } from 'svelte/transition'
  import Modal from '$lib/components/Modal.svelte'
  import check from '$lib/icons/check.js'
  import { flip } from 'svelte/animate'
  import discord from '$lib/icons/discord.js'
  import github from '$lib/icons/github.js'
  import twitter from '$lib/icons/twitter.js'

  import {
    FiatDenomination,
    type Language,
    type Settings,
    type Tile
  } from '$lib/@types/settings.js'

  import {
    ALL_LANGUAGES,
    CURRENCY_SYMBOLS,
    DISCORD_LINK,
    DOCS_LINK,
    GITHUB_LINK,
    SUPPORTED_LANGUAGES,
    TILES,
    TWITTER_LINK
  } from '$lib/constants.js'

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

  let notificationsError: string
  let showingTestNotification: Notification | null = null

  const toggleNotifications = async () => {
    notificationsError = ''

    if (!$settings$.notifications) {
      if (!notification.permission()) {
        try {
          const permission = await notification.requestPermission()

          if (permission !== 'granted') {
            notificationsError = $translate('app.errors.permissions_notifications')
            return
          }
        } catch (error) {}
      }
    }

    toggle('notifications')
  }

  const toggleLavaLamp = () => toggle('lavaLamp')

  const showTestNotification = () => {
    if (showingTestNotification?.close) {
      showingTestNotification.close()
      showingTestNotification = null
    } else {
      showingTestNotification = notification.create({
        heading: $translate('app.labels.test'),
        message: $translate('app.labels.testing')
      })
    }
  }

  let showLanguageModal = false
  const toggleLangModal = () => (showLanguageModal = !showLanguageModal)

  const setLanguage = (language: Language) => {
    $settings$.language = language
  }

  let showCurrencyModal = false
  const toggleCurrencyModal = () => (showCurrencyModal = !showCurrencyModal)

  const setFiat = (fiat: FiatDenomination) => {
    $settings$.fiatDenomination = fiat
  }

  let showHomescreenModal = false
  const toggleHomescreenModal = () => (showHomescreenModal = !showHomescreenModal)

  const toggleTile = (tile: Tile) => {
    if ($settings$.tiles.includes(tile)) {
      $settings$.tiles = $settings$.tiles.filter((t) => t !== tile)
    } else {
      $settings$.tiles = [...$settings$.tiles.filter((t) => t !== 'settings'), tile, 'settings']
    }
  }

  $: sortedTiles = TILES.filter((t) => t !== 'settings')
    .reduce(
      (sorted, tile) => {
        if ($settings$.tiles.includes(tile)) {
          sorted[0].push(tile)
        } else {
          sorted[1].push(tile)
        }

        return sorted
      },
      [[], []] as [Tile[], Tile[]]
    )
    .flat()
</script>

<svelte:head>
  <title>{$translate('app.titles./settings')}</title>
</svelte:head>

<Section>
  <div class="flex items-center gap-x-4">
    <SectionHeading icon={settingsOutline} />
    <div class="text-sm font-semibold">{$translate('app.labels.clams')} v{version}</div>
  </div>

  <div class="w-full flex flex-wrap gap-2 mt-2">
    {#if notification.supported()}
      <button on:click={toggleNotifications} class="p-4 border rounded-lg break-inside-avoid">
        <div class="flex items-center justify-between mb-2">
          <div class="uppercase font-semibold mr-6 leading-none">
            {$translate('app.labels.notifications')}
          </div>
          <div class="mb-0.5">
            <Toggle bind:toggled={$settings$.notifications} />
          </div>
        </div>

        <div class="max-w-[200px] text-sm">
          {$translate('app.labels.notifications_description')}
        </div>

        {#if $settings$.notifications}
          <div transition:slide={{ axis: 'y' }} class="w-full flex justify-end">
            <button
              class="mt-2 text-sm font-semibold px-2 border-2 rounded"
              on:click|stopPropagation={showTestNotification}
              >{$translate(
                `app.labels.${showingTestNotification?.close ? 'close' : 'test'}`
              )}</button
            >
          </div>
        {/if}
      </button>
    {/if}

    <button on:click={toggleLangModal} class="p-4 border rounded-lg">
      <div class="flex items-center justify-between mb-2">
        <div class="uppercase font-semibold mr-6">{$translate('app.labels.language')}</div>
        <div
          class="font-semibold whitespace-nowrap border border-purple-400 px-1.5 text-sm rounded"
        >
          {$translate(`app.languages.${$settings$.language}`)}
        </div>
      </div>

      <div class="max-w-[200px] text-sm">
        {$translate('app.labels.language_description')}
      </div>
    </button>

    <button on:click={toggleCurrencyModal} class="p-4 border rounded-lg">
      <div class="flex items-center justify-between mb-2">
        <div class="uppercase font-semibold mr-6">{$translate('app.labels.fiat')}</div>
        <div
          class="font-semibold whitespace-nowrap border border-purple-400 px-1.5 text-sm rounded"
        >
          {#if !$settings$.fiatDenomination}
            {$translate('app.labels.no_fiat')}
          {:else}
            {$settings$.fiatDenomination.toUpperCase()}
          {/if}
        </div>
      </div>

      <div class="max-w-[200px] text-sm">
        {$translate('app.labels.fiat_description')}
      </div>
    </button>

    <button on:click={toggleHomescreenModal} class="p-4 border rounded-lg">
      <div class="flex items-center justify-between mb-2">
        <div class="uppercase font-semibold mr-6">{$translate('app.labels.homescreen')}</div>
      </div>

      <div class="max-w-[200px] text-sm">
        {$translate('app.labels.homescreen_description')}
      </div>
    </button>

    <button on:click={toggleLavaLamp} class="p-4 border rounded-lg break-inside-avoid">
      <div class="flex items-center justify-between mb-2">
        <div class="uppercase font-semibold mr-6 leading-none">
          {$translate('app.labels.lava_lamp')}
        </div>
        <div class="mb-0.5">
          <Toggle bind:toggled={$settings$.lavaLamp} />
        </div>
      </div>

      <div class="max-w-[200px] text-sm">
        {$translate('app.labels.lava_lamp_description')}
      </div>

      {#if $settings$.notifications}
        <div transition:slide={{ axis: 'y' }} class="w-full flex justify-end">
          <button
            class="mt-2 text-sm font-semibold px-2 border-2 rounded"
            on:click|stopPropagation={showTestNotification}
            >{$translate(`app.labels.${showingTestNotification?.close ? 'close' : 'test'}`)}</button
          >
        </div>
      {/if}
    </button>
  </div>

  <div class="w-full flex items-center mt-6">
    <div class="flex items-center gap-x-4">
      <a href={DISCORD_LINK} rel="noopener noreferrer" target="_blank"
        ><div class="w-6">{@html discord}</div></a
      >
      <a href={GITHUB_LINK} rel="noopener noreferrer" target="_blank"
        ><div class="w-6">{@html github}</div></a
      >
      <a href={TWITTER_LINK} rel="noopener noreferrer" target="_blank"
        ><div class="w-6">{@html twitter}</div></a
      >
      <a href={DOCS_LINK} rel="noopener noreferrer" target="_blank"
        >{$translate('app.labels.docs')}</a
      >
    </div>
  </div>
</Section>

{#if showLanguageModal}
  <Modal on:close={() => (showLanguageModal = false)}>
    <div class="w-full h-full overflow-y-auto overflow-x-hidden">
      {#each ALL_LANGUAGES as language}
        {@const disabled = !SUPPORTED_LANGUAGES.includes(language)}

        <button
          class="w-full disabled:opacity-50"
          {disabled}
          on:click={() => setLanguage(language)}
        >
          <SummaryRow>
            <span slot="label">{$translate(`app.languages.${language}`)}</span>

            <div slot="value">
              {#if $settings$.language === language}
                <div in:fade|local={{ duration: 250 }} class="w-6">
                  {@html check}
                </div>
              {/if}
            </div>
          </SummaryRow>
        </button>
      {/each}
    </div>
  </Modal>
{/if}

{#if showCurrencyModal}
  <Modal on:close={() => (showCurrencyModal = false)}>
    <div class="w-full h-full overflow-y-auto overflow-x-hidden">
      {#each Object.values(FiatDenomination) as fiat}
        <button class="w-full disabled:opacity-50" on:click={() => setFiat(fiat)}>
          <SummaryRow>
            <span slot="label"
              >{fiat === 'none'
                ? $translate('app.labels.no_fiat').toUpperCase()
                : fiat.toUpperCase()}
              {CURRENCY_SYMBOLS[fiat]}</span
            >

            <div slot="value">
              {#if $settings$.fiatDenomination === fiat}
                <div in:fade|local={{ duration: 250 }} class="w-6">
                  {@html check}
                </div>
              {/if}
            </div>
          </SummaryRow>
        </button>
      {/each}
    </div>
  </Modal>
{/if}

{#if showHomescreenModal}
  <Modal on:close={() => (showHomescreenModal = false)}>
    <div class="w-full h-full overflow-y-auto overflow-x-hidden">
      {#each sortedTiles as tile (tile)}
        {@const toggled = $settings$.tiles.includes(tile)}

        <button
          animate:flip={{ duration: 350 }}
          class="w-full disabled:opacity-50"
          on:click={() => toggleTile(tile)}
        >
          <SummaryRow>
            <span slot="label">{$translate(`app.routes./${tile}.title`)}</span>

            <div slot="value">
              <Toggle {toggled} on:change={() => toggleTile(tile)} />
            </div>
          </SummaryRow>
        </button>
      {/each}
    </div>
  </Modal>
{/if}
