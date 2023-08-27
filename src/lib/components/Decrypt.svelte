<script lang="ts">
  import type { Session } from '$lib/@types/session.js'
  import Section from '$lib/components/Section.svelte'
  import Button from '$lib/components/Button.svelte'
  import Msg from '$lib/components/Msg.svelte'
  import TextInput from '$lib/components/TextInput.svelte'
  import { translate } from '$lib/i18n/translations'
  import ClamsLogo from '$lib/icons/ClamsLogo.svelte'
  import { session$ } from '$lib/streams.js'
  import Paragraph from '$lib/components/Paragraph.svelte'
  import { onMount } from 'svelte'
  import { createEventDispatcher } from 'svelte'
  import { bytesToHex } from '@noble/hashes/utils'
  import * as secp256k1 from '@noble/secp256k1'
  import { decryptWithAES } from '$lib/crypto.js'
  import { storage } from '$lib/services.js'
  import { STORAGE_KEYS } from '$lib/constants.js'
  import key from '$lib/icons/key.js'

  const translationBase = 'app.routes./decrypt'

  let passphrase: string
  let errorMsg: string
  let decryptButton: Button

  const dispatch = createEventDispatcher()

  async function decrypt() {
    try {
      const storedSession = storage.get(STORAGE_KEYS.session) as string
      const session = JSON.parse(storedSession) as Session
      const decrypted = decryptWithAES(session.secret, passphrase)

      if (!decrypted) {
        throw new Error('Could not decrypt.')
      }

      session$.next({ secret: decrypted, id: bytesToHex(secp256k1.getPublicKey(decrypted, true)) })
      dispatch('close')
    } catch (error) {
      errorMsg = $translate('app.errors.invalid_passphrase')
    }
  }

  function handleKeyPress(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      decryptButton.click()
    }
  }

  let input: TextInput

  onMount(() => setTimeout(() => input.focus(), 250))
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
      on:input={() => (errorMsg = '')}
      name="passphrase"
      type="password"
      bind:value={passphrase}
      bind:this={input}
      label={$translate('app.labels.passphrase')}
    />
  </div>

  <div class="mt-4 w-full flex justify-end">
    <div class="w-min">
      <Button
        bind:this={decryptButton}
        on:click={decrypt}
        text={$translate('app.labels.decrypt')}
        primary
        disabled={!passphrase}
      >
        <div class="w-6 mr-2 -ml-2" slot="iconLeft">{@html key}</div>
      </Button>
    </div>
  </div>

  <div class="mt-6">
    <Msg bind:message={errorMsg} type="error" />
  </div>
</Section>
