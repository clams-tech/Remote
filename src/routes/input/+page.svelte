<script lang="ts">
  import type { ParsedInput } from '$lib/@types/common.js'
  import Scanner from './components/Scanner.svelte'
  import Section from '$lib/elements/Section.svelte'
  import SectionHeading from '$lib/elements/SectionHeading.svelte'
  import { translate } from '$lib/i18n/translations.js'
  import Keyboard from './components/Keyboard.svelte'
  import scan from '$lib/icons/scan.js'
  import keyboard from '$lib/icons/keyboard.js'
  import photo from '$lib/icons/photo.js'

  type InputKey = 'scanner' | 'keyboard' | 'image' | 'nfc'

  let input: InputKey = 'scanner'

  $: heading = $translate(`app.labels.${input}`)

  const buttons: { key: InputKey; icon: string }[] = [
    { key: 'scanner', icon: scan },
    { key: 'keyboard', icon: keyboard },
    { key: 'image', icon: photo }
  ]

  const handleInput = (input: ParsedInput) => {
    //
  }
</script>

<Section>
  <SectionHeading text={heading} />

  {#if input === 'scanner'}
    <div class="w-full flex items-center">
      <Scanner on:input={(e) => handleInput(e.detail)} />
    </div>
  {:else if input === 'keyboard'}
    <Keyboard on:input={(e) => handleInput(e.detail)} />
  {:else if input === 'image'}
    <!-- @TODO -->
  {:else if input === 'nfc'}
    <!-- @TODO -->
  {/if}

  <div class="flex w-full justify-center items-center gap-x-2 mt-2">
    {#each buttons as { key, icon }}
      <button
        class:border={key === input}
        class:border-purple-400={key === input}
        class="w-12 p-1 rounded shadow shadow-current bg-neutral-900 transition-all"
        on:click={() => (input = key)}>{@html icon}</button
      >
    {/each}
  </div>
</Section>
