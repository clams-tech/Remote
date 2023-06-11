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
      validAddress = validateParsedNodeAddress(parseNodeAddress(configurationUpdate.address))
    } catch {
      validAddress = false
    }
  }
</script>

<div class="w-full mt-2">
  <!-- CONNECTION -->
  <h4 class="text-lg font-bold mb-3">{$translate('app.labels.configuration')}</h4>

  <TextInput
    name="address"
    type="text"
    label={$translate('app.inputs.node_connect.label')}
    invalid={configurationUpdate.address && !validAddress
      ? $translate('app.inputs.node_connect.invalid')
      : ''}
    placeholder={$translate('app.inputs.node_connect.placeholder')}
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
      type="textarea"
      rows={3}
      label={$translate('app.inputs.add_rune.label')}
      placeholder={$translate('app.inputs.add_rune.placeholder')}
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
