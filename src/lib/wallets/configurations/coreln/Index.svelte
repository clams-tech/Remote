<script lang="ts">
  import { translate } from '$lib/i18n/translations.js'
  import type { CoreLnConfiguration } from '$lib/@types/wallets.js'
  import TextInput from '$lib/components/TextInput.svelte'
  import { simpleDeepClone, truncateValue } from '$lib/utils'
  import { slide } from 'svelte/transition'
  import AdvancedConnection from './AdvancedConnection.svelte'
  import { createEventDispatcher, onMount } from 'svelte'
  import Button from '$lib/components/Button.svelte'
  import check from '$lib/icons/check.js'
  import close from '$lib/icons/close.js'
  import { DOCS_LINK } from '$lib/constants.js'
  import info from '$lib/icons/info.js'
  import CopyValue from '$lib/components/CopyValue.svelte'
  import { session$ } from '$lib/streams.js'
  import { methods } from '$lib/wallets/coreln/index.js'
  import { validateNodeAddress } from '$lib/address.js'
  import type { Session } from '$lib/@types/session.js'
  import ShowMoar from '$lib/components/ShowMoar.svelte'
  import { decode, type DecodedRune } from 'rune-decoder'
  import { formatDateRelativeToNow } from '$lib/dates.js'
  import Msg from '$lib/components/Msg.svelte'
  import Modal from '$lib/components/Modal.svelte'
  import SummaryRow from '$lib/components/SummaryRow.svelte'
  import warning from '$lib/icons/warning.js'

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

  $: if (configurationUpdate.address) {
    try {
      validAddress = validateNodeAddress(configurationUpdate.address)
    } catch {
      validAddress = false
    }
  }

  const getClamsRuneCommand = () => {
    const { id } = $session$ as Session
    return `lightning-cli commando-rune restrictions='[["id=${id}"], [${methods.map(
      (method) => `"method=${method}"`
    )}], ["rate=120"]]'`
  }

  const getAdminRuneCommand = () => {
    const { id } = $session$ as Session
    return `lightning-cli commando-rune restrictions='[["id=${id}"], ["rate=120"]]'`
  }

  const getReadOnlyRuneCommand = () => {
    const { id } = $session$ as Session
    return `lightning-cli commando-rune restrictions='[["id=${id}"], ["rate=120"], ["method^list", "method^get", "method=summary", "method^bkpr"], ["method/listdatastore"]]'`
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

  let formattedRestrictions: string
  let decodedRune: DecodedRune | null
  let decodeRuneError: string | null
  let showDecodedRuneModal = false

  const decodeRune = async () => {
    decodeRuneError = null
    decodedRune = decode(configurationUpdate.token)

    if (decodedRune) {
      formattedRestrictions = await Promise.all(
        decodedRune.restrictions.map(async ({ summary }) => {
          const alternatives = summary.split(' OR ')
          const formattedAlternatives = await Promise.all(
            alternatives.map(async (alternative) => {
              let words = alternative.split(' ')
              const lastIndex = words.length - 1
              const lastValue = words[lastIndex]

              // format rate limit
              if (words[0] === 'rate') {
                words = ['rate', 'limited', 'to', `${lastValue} requests per minute`]
              }

              // format id
              if (words[0] === 'id') {
                words[lastIndex] = truncateValue(lastValue)
              }

              // format time
              if (words[0] === 'time') {
                const timeMs = parseInt(lastValue) * 1000

                words = ['valid', 'until', await formatDateRelativeToNow(timeMs / 1000)]
              }

              words = words.map((word, i) => {
                // first or last word
                if (i === 0 || i === words.length - 1) {
                  word = `<b>${word}</b>`
                }

                return word
              })

              return words.join(' ')
            })
          )

          return formattedAlternatives.join('<span class="text-xs mr-2"><i><br>OR<br></i></span>')
        })
      ).then((restrictions) =>
        restrictions.join('<span class="text-xs mr-2"><i><br>AND<br></i></span>')
      )

      showDecodedRuneModal = true
    } else {
      decodeRuneError = $translate('app.errors.decode_rune')
    }
  }
</script>

<svelte:window on:keyup|stopPropagation={handleKeyPress} />

<div class="w-full py-2">
  <div class="flex items-center w-full justify-between mb-3">
    <h4 class="text-lg font-bold">{$translate('app.labels.configuration')}</h4>
    <!-- @TODO - Ensure docs links are up for connections help -->
    <a
      href={`${DOCS_LINK}/wallets/coreln`}
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

  <div class="mt-2 text-xs">
    <ShowMoar label={$translate('app.labels.advanced')}>
      <AdvancedConnection bind:connection={configurationUpdate.connection} />
    </ShowMoar>
  </div>

  <!-- AUTHENTICATION -->
  <div class="w-full mt-4 relative">
    <TextInput
      name="token"
      type="text"
      label={$translate('app.labels.rune')}
      placeholder={$translate('app.labels.rune_placeholder')}
      bind:value={configurationUpdate.token}
    />

    {#if configurationUpdate.token}
      <button
        on:click={decodeRune}
        class="absolute top-0 right-0 text-xs border rounded-lg px-2 font-semibold py-0.5 hover:bg-neutral-800 transition-colors"
        >Decode rune</button
      >
    {/if}

    <div class="text-xs mt-2">
      <ShowMoar label={$translate('app.labels.rune_commands')}>
        <div class="flex items-center gap-2 flex-wrap text-xs font-semibold">
          <div class="border rounded-xl py-0.5 pl-2 hover:bg-neutral-800 transition-colors">
            <CopyValue
              value={getClamsRuneCommand()}
              label={$translate('app.labels.clams_rune_cli')}
            />
          </div>

          <div class="border rounded-xl py-0.5 pl-2 hover:bg-neutral-800 transition-colors">
            <CopyValue
              value={getAdminRuneCommand()}
              label={$translate('app.labels.admin_rune_cli')}
            />
          </div>

          <div class="border rounded-xl py-0.5 pl-2 hover:bg-neutral-800 transition-colors">
            <CopyValue
              value={getReadOnlyRuneCommand()}
              label={$translate('app.labels.readonly_rune_cli')}
            />
          </div>
        </div>
      </ShowMoar>
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

  {#if decodeRuneError}
    <div in:slide={{ axis: 'y' }}>
      <Msg type="error" bind:message={decodeRuneError} />
    </div>
  {/if}
</div>

{#if showDecodedRuneModal && decodedRune}
  <Modal on:close={() => (showDecodedRuneModal = false)}>
    <div class="h-full overflow-auto w-full">
      <h4 class="font-semibold mb-2 w-full text-2xl">{$translate('app.labels.rune_summary')}</h4>

      <SummaryRow>
        <span slot="label">{$translate('app.labels.id')}:</span>
        <span slot="value">{decodedRune.id}</span>
      </SummaryRow>

      <SummaryRow>
        <span slot="label">{$translate('app.labels.hash')}:</span>
        <span slot="value">{truncateValue(decodedRune.hash)}</span>
      </SummaryRow>

      <SummaryRow baseline={!!decodedRune.restrictions.length}>
        <span slot="label">{$translate('app.labels.restrictions')}:</span>
        <p slot="value">
          {#if decodedRune.restrictions.length === 0}
            <div class="flex items-center">
              <div class="w-4 mr-2 text-utility-pending">
                {@html warning}
              </div>
              <span class="text-utility-pending">{$translate('app.labels.unrestricted')}</span>
            </div>
          {:else}
            {#await formattedRestrictions then formatted}
              {@html formattedRestrictions}
            {/await}
          {/if}
        </p>
      </SummaryRow>
    </div>
  </Modal>
{/if}
