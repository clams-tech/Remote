<script lang="ts">
  import { translate } from '$lib/i18n/translations.js'
  import type { CoreLnConfiguration } from '$lib/@types/connections.js'
  import TextInput from '$lib/elements/TextInput.svelte'
  import { parseNodeAddress, simpleDeepClone, validateParsedNodeAddress } from '$lib/utils'
  import { slide } from 'svelte/transition'
  import caret from '$lib/icons/caret.js'
  import AdvancedConnection from './AdvancedConnection.svelte'
  import { createEventDispatcher } from 'svelte'
  import Button from '$lib/elements/Button.svelte'
  import check from '$lib/icons/check.js'
  import close from '$lib/icons/close.js'
  import { DOCS_LINK } from '$lib/constants.js'
  import info from '$lib/icons/info.js'

  export let configuration: CoreLnConfiguration

  const translateBase = 'app.routes./connections/coreln'

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
      validAddress = validateParsedNodeAddress(parseNodeAddress(configurationUpdate.address))
    } catch {
      validAddress = false
    }
  }
</script>

<div class="w-full py-4">
  <div class="flex items-center w-full justify-between mb-3">
    <h4 class="text-lg font-bold">{$translate('app.labels.configuration')}</h4>
    <!-- @TODO - Ensure docs links are up for connections help -->
    <a
      href={`${DOCS_LINK}/connections/coreln`}
      target="_blank"
      rel="noopener noreferrer"
      class="flex items-center ml-2 text-sm dark:text-purple-100 text-purple-800"
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
    label={$translate(`${translateBase}.configuration.address_label`)}
    invalid={configurationUpdate.address && !validAddress
      ? $translate(`${translateBase}.configuration.address_invalid`)
      : ''}
    placeholder={$translate(`${translateBase}.configuration.address_placeholder`)}
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
      transition:slide|local={{ duration: 250 }}
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
      label={$translate(`${translateBase}.configuration.rune_label`)}
      placeholder={$translate(`${translateBase}.configuration.rune_placeholder`)}
      bind:value={configurationUpdate.token}
    />
  </div>

  {#if modified}
    <div transition:slide|local={{ duration: 250 }} class="flex items-center w-full mt-4 gap-x-2">
      <Button on:click={resetConfigurationUpdate} text="Cancel">
        <div slot="iconRight" class="w-6 ml-1">{@html close}</div>
      </Button>

      <Button on:click={dispatchUpdate} primary text="Update">
        <div slot="iconRight" class="w-6 ml-1">{@html check}</div>
      </Button>
    </div>
  {/if}
</div>
