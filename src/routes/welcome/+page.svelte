<script lang="ts">
  import * as secp256k1 from '@noble/secp256k1'
  import { bytesToHex } from '@noble/hashes/utils'
  import { goto } from '$app/navigation'
  import Section from '$lib/elements/Section.svelte'
  import Button from '$lib/elements/Button.svelte'
  import Msg from '$lib/elements/Msg.svelte'
  import TextInput from '$lib/elements/TextInput.svelte'
  import { translate } from '$lib/i18n/translations'
  import ClamsLogo from '$lib/icons/ClamsLogo.svelte'
  import { STORAGE_KEYS, writeDataToStorage } from '$lib/storage.js'
  import { session$ } from '$lib/streams.js'
  import { createRandomHex, encryptWithAES } from '$lib/utils.js'
  import Paragraph from '$lib/elements/Paragraph.svelte'

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
    const publicKey = bytesToHex(secp256k1.getPublicKey(secret, true))
    const encrypted = encryptWithAES(secret, passphrase)

    const success = writeDataToStorage(
      STORAGE_KEYS.session,
      JSON.stringify({ secret: encrypted, id: publicKey })
    )

    if (!success) {
      errorMsg = $translate('app.errors.storage_access')

      return
    }

    const session = { secret, id: publicKey }
    session$.next(session)

    await goto('/')
  }

  let encryptButton: Button

  function handleKeyPress(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      encryptButton.click()
    }
  }
</script>

<svelte:window on:keyup={handleKeyPress} />

<Section>
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
            `${translationBase}.passphrase.${score < 3 ? 'weak' : score < 5 ? 'medium' : 'strong'}`
          )}
      name="passphrase"
      type="password"
      bind:value={passphrase}
      label={$translate('app.labels.passphrase')}
    />
  </div>

  <div class="mt-4">
    <Button
      bind:this={encryptButton}
      on:click={encryptAndStoreSecret}
      text={$translate('app.labels.encrypt')}
      primary
      disabled={score === 0}
    />
  </div>

  <div class="mt-6">
    <Msg bind:message={errorMsg} type="error" />
  </div>
</Section>
