<script lang="ts">
  import { settings$ } from '$lib/streams'
  import Toggle from '$lib/components/Toggle.svelte'
  import { translate } from '$lib/i18n/translations'
  import SummaryRow from '$lib/components/SummaryRow.svelte'
  import settingsOutline from '$lib/icons/settings-outline'
  import type { Language, Settings } from '$lib/@types/settings.js'
  import Section from '$lib/components/Section.svelte'
  import SectionHeading from '$lib/components/SectionHeading.svelte'
  import { notification } from '$lib/services.js'
  import { fade, slide } from 'svelte/transition'
  import Modal from '$lib/components/Modal.svelte'
  import { ALL_LANGUAGES, SUPPORTED_LANGUAGES } from '$lib/constants.js'
  import check from '$lib/icons/check.js'

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

  /**
   * version
   * language
   * fiat currency
   * notifications
   */
</script>

<svelte:head>
  <title>{$translate('app.titles./settings')}</title>
</svelte:head>

<Section>
  <div class="flex items-center justify-between">
    <SectionHeading icon={settingsOutline} />
    <div class="text-sm font-semibold">{$translate('app.labels.clams')} v{version}</div>
  </div>

  <div class="w-full flex items-start flex-wrap gap-2 mt-2">
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
  </div>
</Section>

{#if showLanguageModal}
  <Modal>
    <div class="w-full h-full overflow-y-auto overflow-x-hidden">
      {#each ALL_LANGUAGES as language}
        {@const disabled = !SUPPORTED_LANGUAGES.includes(language)}

        <button
          class="w-full disabled:opacity-50"
          {disabled}
          on:click={() => setLanguage(language)}
        >
          <SummaryRow>
            <span slot="label">{language}</span>

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
