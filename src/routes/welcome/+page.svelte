<script lang="ts">
  import { goto } from '$app/navigation'
  import Section from '$lib/components/Section.svelte'
  import Button from '$lib/components/Button.svelte'
  import TextInput from '$lib/components/TextInput.svelte'
  import { translate } from '$lib/i18n/translations'
  import RemoteIcon from '$lib/icons/remote'
  import { session$, settings$ } from '$lib/streams.js'
  import Paragraph from '$lib/components/Paragraph.svelte'
  import { notification, storage } from '$lib/services.js'
  import { STORAGE_KEYS } from '$lib/constants.js'
  import Toggle from '$lib/components/Toggle.svelte'
  import { slide } from 'svelte/transition'
  import ErrorDetail from '$lib/components/ErrorDetail.svelte'
  import type { AppError } from '$lib/@types/errors.js'
  import { nowSeconds } from '$lib/utils.js'
  import { createNewSession } from '$lib/session.js'
  import { base } from '$app/paths'

  const translationBase = 'app.routes./welcome'

  let passphrase: string
  let score: number
  let error: AppError | null = null

  const hasUppercase = /[A-Z]+/
  const hasLowerCase = /[a-z]+/
  const hasNumber = /[0-9]+/
  const hasSpecial = /[!@#$%^&*()_=+]+/

  $: if (passphrase) {
    score = 0

    if (hasUppercase.test(passphrase)) {
      score++
    }

    if (hasLowerCase.test(passphrase)) {
      score++
    }

    if (hasNumber.test(passphrase)) {
      score++
    }

    if (hasSpecial.test(passphrase)) {
      score++
    }

    if (passphrase.length > 12) {
      score += 2
    }
  } else {
    score = 0
  }

  async function encryptAndStoreSecret() {
    const { encrypted, decrypted } = await createNewSession(passphrase)

    try {
      storage.write(STORAGE_KEYS.session, JSON.stringify(encrypted))
    } catch (e) {
      error = {
        key: 'storage_access',
        detail: {
          timestamp: nowSeconds(),
          message: 'Could not access storage when trying to store session details',
          context: 'Storing session'
        }
      }

      return
    }

    session$.next(decrypted)

    await goto(`${base}`)
  }

  let encryptButton: Button

  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      encryptButton.click()
    }
  }

  let notificationsError = ''

  const toggleNotifications = async () => {
    notificationsError = ''
    $settings$.notifications = !$settings$.notifications
  }
</script>

<svelte:window on:keyup|stopPropagation={handleKeyPress} />

<svelte:head>
  <title>{$translate(`app.routes./welcome.title`)}</title>
</svelte:head>

<Section>
  <div class="flex w-full justify-center">
    <div class="w-full flex flex-col items-center justify-center max-w-lg">
      <div class="w-full flex justify-center mb-8">
        <div class="w-[150px] md:w-[200px] xl:w-[250px]">
          {@html RemoteIcon}
        </div>
      </div>

      <Paragraph>
        {@html $translate(`${translationBase}.subheading`)}
      </Paragraph>

      <div class="mt-6 w-full">
        <TextInput
          hint={score === 0
            ? ''
            : $translate(
                `${translationBase}.passphrase.${
                  score < 3 ? 'weak' : score < 5 ? 'medium' : 'strong'
                }`
              )}
          name="passphrase"
          type="password"
          bind:value={passphrase}
          label={$translate('app.labels.passphrase')}
        />
      </div>

      {#if notification.supported()}
        <div class="mt-4 w-full">
          <button on:click={toggleNotifications} class="p-4 border rounded-lg break-inside-avoid">
            <div class="flex items-center justify-between mb-2">
              <div class="uppercase font-semibold mr-6 leading-none">
                {$translate('app.labels.notifications')}
              </div>
              <div class="mb-0.5">
                <Toggle bind:toggled={$settings$.notifications} />
              </div>
            </div>

            <div class="text-sm">
              {$translate('app.labels.notifications_description')}
            </div>
          </button>
        </div>
      {/if}

      <div class="mt-4 w-full flex justify-end">
        <div class="w-min">
          <Button
            bind:this={encryptButton}
            on:click={encryptAndStoreSecret}
            text={$translate('app.labels.lets_go')}
            primary
            disabled={score === 0}
          />
        </div>
      </div>

      {#if error}
        <div class="mt-2" transition:slide={{ axis: 'y' }}>
          <ErrorDetail {error} />
        </div>
      {/if}
    </div>
  </div>
</Section>
