<script lang="ts">
  import { secp256k1 } from '@noble/curves/secp256k1'
  import { bytesToHex } from '@noble/hashes/utils'
  import { goto } from '$app/navigation'
  import Section from '$lib/components/Section.svelte'
  import Button from '$lib/components/Button.svelte'
  import Msg from '$lib/components/Msg.svelte'
  import TextInput from '$lib/components/TextInput.svelte'
  import { translate } from '$lib/i18n/translations'
  import ClamsLogo from '$lib/icons/ClamsLogo.svelte'
  import { session$, settings$ } from '$lib/streams.js'
  import Paragraph from '$lib/components/Paragraph.svelte'
  import { createRandomHex, encryptWithAES } from '$lib/crypto.js'
  import { notification, storage } from '$lib/services.js'
  import { STORAGE_KEYS } from '$lib/constants.js'
  import Toggle from '$lib/components/Toggle.svelte'

  const translationBase = 'app.routes./welcome'
  const secret = createRandomHex()

  let passphrase: string
  let score: number
  let errorMsg: string

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
    const publicKey = bytesToHex(secp256k1.getPublicKey(secret, true))
    const encrypted = encryptWithAES(secret, passphrase)

    try {
      storage.write(STORAGE_KEYS.session, JSON.stringify({ secret: encrypted, id: publicKey }))
    } catch (error) {
      errorMsg = $translate('app.errors.storage_access')
      return
    }

    const session = { secret, id: publicKey }
    session$.next(session)

    await goto('/')
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

    if (!$settings$.notifications) {
      if (!notification.permission()) {
        try {
          const permission = await notification.requestPermission()

          if (permission !== 'granted') {
            notificationsError = $translate('app.errors.permissions_notifications')
            return
          }
        } catch (error) {
          notificationsError = $translate('app.errors.permissions_notifications')
        }
      }
    }

    $settings$.notifications = !$settings$.notifications
  }
</script>

<svelte:window on:keyup|stopPropagation={handleKeyPress} />

<Section>
  <div class="flex w-full justify-center">
    <div class="w-full flex flex-col items-center justify-center max-w-lg">
      <div class="w-full flex justify-center mb-8">
        <div class="w-[150px] md:w-[200px] xl:w-[250px]">
          <ClamsLogo />
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

          {#if notificationsError}
            <Msg type="error" message={notificationsError} />
          {/if}
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

      {#if errorMsg}
        <div class="mt-6">
          <Msg bind:message={errorMsg} type="error" />
        </div>
      {/if}
    </div>
  </div>
</Section>
