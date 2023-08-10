<script lang="ts">
  import { translate } from '$lib/i18n/translations.js'
  import type { CoreLnConfiguration } from '$lib/@types/connections.js'
  import TextInput from '$lib/components/TextInput.svelte'
  import { simpleDeepClone } from '$lib/utils'
  import { slide } from 'svelte/transition'
  import caret from '$lib/icons/caret.js'
  import AdvancedConnection from './AdvancedConnection.svelte'
  import { createEventDispatcher, onMount } from 'svelte'
  import Button from '$lib/components/Button.svelte'
  import check from '$lib/icons/check.js'
  import close from '$lib/icons/close.js'
  import { DOCS_LINK } from '$lib/constants.js'
  import info from '$lib/icons/info.js'
  import CopyValue from '$lib/components/CopyValue.svelte'
  import { session$ } from '$lib/streams.js'
  import { methods } from '$lib/connections/coreln/index.js'
  import { validateNodeAddress } from '$lib/address.js'

  export let configuration: CoreLnConfiguration

  /**Clone of the saved configuration to mutate
   * can then compare against the saved configuration
   * and offer option to save or discard changes
   */
  let configurationUpdate: CoreLnConfiguration

  const resetConfigurationUpdate = () => {
    configurationUpdate = simpleDeepClone(configuration)
  }

  /**when configuration is updated in db, reset the update*/
  $: if (configuration) {
    resetConfigurationUpdate()
  }

  $: modified =
    configurationUpdate && JSON.stringify(configuration) !== JSON.stringify(configurationUpdate)

  const dispatch = createEventDispatcher()
  const dispatchUpdate = () => dispatch('updated', configurationUpdate)

  let focusConnectionInput: () => void
  let validAddress = false
  let expandConnectionSettings = false

  $: if (configurationUpdate.address) {
    try {
      validAddress = validateNodeAddress(configurationUpdate.address)
    } catch {
      validAddress = false
    }
  }

  const getRuneCommand = () => {
    const { id } = $session$!
    return `lightning-cli commando-rune restrictions='[["id=${id}"], [${methods.map(
      (method) => `"method=${method}"`
    )}], ["rate=120"]]'`
  }

  const handleKeyPress = (e: KeyboardEvent) => {
    if (modified) {
      if (e.key === 'Enter') {
        dispatchUpdate()
      }

      if (e.key === 'Escape') {
        resetConfigurationUpdate()
      }
    }
  }

  onMount(() => focusConnectionInput && focusConnectionInput())
</script>

<svelte:window on:keyup={handleKeyPress} />

<div class="w-full py-2">
  <div class="flex items-center w-full justify-between mb-3">
    <h4 class="text-lg font-bold">{$translate('app.labels.configuration')}</h4>
    <!-- @TODO - Ensure docs links are up for connections help -->
    <a
      href={`${DOCS_LINK}/connections/coreln`}
      target="_blank"
      rel="noopener noreferrer"
      class="flex items-center ml-2 text-sm text-purple-100"
    >
      Help?
      <div class="ml-1 w-4 flex justify-center flex-shrink-0 border rounded-full border-current">
        {@html info}
      </div>
    </a>
  </div>

  <!-- CONNECTION -->
  <TextInput
    name="address"
    type="text"
    label={$translate('app.labels.address_label')}
    invalid={configurationUpdate.address && !validAddress
      ? $translate('app.labels.address_invalid')
      : ''}
    placeholder={$translate('app.labels.address_placeholder')}
    bind:value={configurationUpdate.address}
    bind:focus={focusConnectionInput}
  />

  <button
    on:click={() => (expandConnectionSettings = !expandConnectionSettings)}
    class="mt-4 flex items-center text-sm cursor-pointer"
  >
    <div class:-rotate-90={!expandConnectionSettings} class="w-3 mr-1 transition-transform">
      {@html caret}
    </div>

    <span class="font-semibold underline">{$translate('app.labels.advanced')}</span>
  </button>

  <!-- ADVANCED SETTINGS -->
  {#if expandConnectionSettings}
    <div
      transition:slide={{ duration: 250 }}
      class="text-sm mt-2 pl-4 pr-[1px] flex flex-col items-start"
    >
      <AdvancedConnection bind:connection={configurationUpdate.connection} />
    </div>
  {/if}

  <!-- AUTHENTICATION -->
  <div class="w-full mt-4">
    <TextInput
      name="token"
      type="text"
      label={$translate('app.labels.rune')}
      placeholder={$translate('app.labels.rune_placeholder')}
      bind:value={configurationUpdate.token}
    />

    <div class="w-min whitespace-nowrap mt-2">
      <div class="text-xs font-semibold border rounded py-1 pl-2">
        <CopyValue value={getRuneCommand()} label={$translate('app.labels.rune_cli')} />
      </div>
    </div>
  </div>

  {#if modified}
    <div
      transition:slide={{ duration: 250 }}
      class="flex items-center justify-end w-full mt-4 gap-x-2"
    >
      <div class="w-min">
        <Button on:click={resetConfigurationUpdate} text="Cancel">
          <div slot="iconLeft" class="w-6 mr-1 -ml-2">{@html close}</div>
        </Button>
      </div>

      <div class="w-min">
        <Button on:click={dispatchUpdate} primary text="Update">
          <div slot="iconLeft" class="w-6 mr-1 -ml-2">{@html check}</div>
        </Button>
      </div>
    </div>
  {/if}
</div>
