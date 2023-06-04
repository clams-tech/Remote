<script lang="ts">
  import { goto } from '$app/navigation'
  import type { Session } from '$lib/@types/session.js'
  import Section from '$lib/components/Section.svelte'
  import Button from '$lib/elements/Button.svelte'
  import Msg from '$lib/elements/Msg.svelte'
  import TextInput from '$lib/elements/TextInput.svelte'
  import { translate } from '$lib/i18n/translations'
  import ClamsLogo from '$lib/icons/ClamsLogo.svelte'
  import { getSession } from '$lib/storage.js'
  import { session$ } from '$lib/streams.js'
  import { decryptWithAES } from '$lib/utils.js'

  const translationBase = 'app.routes./decrypt'

  let passphrase: string
  let errorMsg: string
  let decryptButton: Button

  const storedSession = getSession() as Session

  async function decrypt() {
    try {
      const decrypted = decryptWithAES(storedSession.secret, passphrase)

      if (!decrypted) {
        throw new Error('Could not decrypt.')
      }

      session$.next({ secret: decrypted })
      await goto('/')
    } catch (error) {
      errorMsg = $translate('app.errors.invalid_passphrase')
    }
  }

  function handleKeyPress(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      decryptButton.click()
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

  <div class="max-w-lg">
    <div>
      <p class="text-neutral-600 dark:text-neutral-300">
        <!-- text-purple-500 -->
        {@html $translate(`${translationBase}.subheading`)}
      </p>
    </div>

    <div class="mt-6 w-full">
      <TextInput
        on:input={() => (errorMsg = '')}
        name="passphrase"
        type="password"
        bind:value={passphrase}
        label={$translate('app.labels.passphrase')}
      />
    </div>

    <div class="mt-4">
      <Button
        bind:this={decryptButton}
        on:click={decrypt}
        text={$translate('app.labels.decrypt')}
        primary
        disabled={!passphrase}
      />
    </div>

    <div class="mt-6">
      <Msg bind:message={errorMsg} type="error" />
    </div>
  </div>
</Section>
