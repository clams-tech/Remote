<script lang="ts">
  import { goto } from '$app/navigation'
  import Button from '$lib/elements/Button.svelte'
  import ErrorMsg from '$lib/elements/ErrorMsg.svelte'
  import TextInput from '$lib/elements/TextInput.svelte'
  import { translate } from '$lib/i18n/translations'
  import ClamsLogo from '$lib/icons/ClamsLogo.svelte'
  import { storageKeys, writeDataToStorage } from '$lib/storage.js'
  import { session$ } from '$lib/streams.js'
  import { createRandomHex, encryptWithAES } from '$lib/utils.js'
  import { fade } from 'svelte/transition'

  const translationBase = 'app.routes./welcome'
  const secret = createRandomHex()

  let passphrase: string
  let score: number
  let errorMsg: string

  const hasUppercase = /[A-Z]+/
  const hasLowerCase = /[a-z]+/
  const hasNumber = /[0-9]+/
  const hasSpecial = /[!@#$%^&*()\_\=\+]+/

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
    const encrypted = encryptWithAES(secret, passphrase)
    const json = JSON.stringify({ secret: encrypted })
    const success = writeDataToStorage(storageKeys.session, json)

    if (!success) {
      errorMsg = $translate('app.errors.storage_access')

      return
    }

    const session = { secret }
    session$.next(session)

    await goto('/')
  }
</script>

<section
  in:fade|local={{ duration: 250 }}
  class="flex flex-col justify-center items-center w-full p-8 bg-neutral-50/95 dark:bg-neutral-900/95"
>
  <div class="w-full flex justify-center mb-8">
    <div class="w-[150px] md:w-[200px] xl:w-[250px]">
      <ClamsLogo />
    </div>
  </div>

  <div class="max-w-lg">
    <div>
      <p class="text-neutral-600 dark:text-neutral-300 text-lg">
        <!-- text-purple-500 -->
        <!-- text-bitcoin-orange -->
        {@html $translate(`${translationBase}.subheading`)}
      </p>
    </div>

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

    <div class="mt-4">
      <Button
        on:click={encryptAndStoreSecret}
        text={$translate('app.labels.encrypt')}
        primary
        disabled={score === 0}
      />
    </div>

    <ErrorMsg bind:message={errorMsg} />
  </div>
</section>
