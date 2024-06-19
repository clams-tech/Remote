<script lang="ts">
  import type { Session } from '$lib/@types/session.js'
  import Section from '$lib/components/Section.svelte'
  import Button from '$lib/components/Button.svelte'
  import TextInput from '$lib/components/TextInput.svelte'
  import { translate } from '$lib/i18n/translations'
  import RemoteIcon from '$lib/icons/remote'
  import { session$ } from '$lib/streams.js'
  import Paragraph from '$lib/components/Paragraph.svelte'
  import { onMount } from 'svelte'
  import { createEventDispatcher } from 'svelte'
  import { decryptWithAES } from '$lib/crypto.js'
  import { storage } from '$lib/services.js'
  import { STORAGE_KEYS } from '$lib/constants.js'
  import key from '$lib/icons/key.js'
  import type { AppError } from '$lib/@types/errors.js'
  import { nowSeconds } from '$lib/utils.js'
  import ErrorDetail from './ErrorDetail.svelte'
  import { slide } from 'svelte/transition'

  const translationBase = 'app.routes./decrypt'

  let passphrase: string
  let appError: AppError | null = null
  let decryptButton: Button

  const dispatch = createEventDispatcher()

  async function decrypt() {
    appError = null

    try {
      const storedSession = storage.get(STORAGE_KEYS.session) as string
      const session = JSON.parse(storedSession) as Session

      const invalidPassphraseError = {
        key: 'invalid_passphrase',
        detail: {
          context: 'decrypt session',
          timestamp: nowSeconds(),
          message: 'Could not decrypt session with passphrase.'
        }
      }

      let decrypted: string

      try {
        decrypted = decryptWithAES(session.secret, passphrase)
      } catch (error) {
        throw invalidPassphraseError
      }

      if (!decrypted) {
        throw invalidPassphraseError
      }

      session$.next({ secret: decrypted, id: session.id })
      dispatch('close')
    } catch (error) {
      appError = error as AppError
    }
  }

  function handleKeyPress(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      decryptButton.click()
    }
  }

  let input: TextInput

  onMount(() => setTimeout(() => input?.focus(), 250))
</script>

<svelte:window on:keyup|stopPropagation={handleKeyPress} />

<Section>
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
      on:input={() => (appError = null)}
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

  {#if appError}
    <div transition:slide={{ axis: 'y' }} class="mt-2">
      <ErrorDetail bind:error={appError} />
    </div>
  {/if}
</Section>
