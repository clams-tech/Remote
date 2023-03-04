<script lang="ts">
  import Button from '$lib/elements/Button.svelte'
  import TextInput from '$lib/elements/TextInput.svelte'
  import { translate } from '$lib/i18n/translations'
  import arrow from '$lib/icons/arrow'
  import { onMount } from 'svelte'

  export let description = ''
  export let error = ''
  export let next: () => void
  export let readonly = false
  export let max = 100
  export let headingsKey = 'description'

  let focusInput: () => void

  onMount(() => {
    setTimeout(focusInput, 500)
  })
</script>

<section class="flex flex-col justify-center w-full p-6 max-w-lg">
  <div class="mb-6">
    <h1 class="text-4xl font-bold mb-4">{$translate(`app.headings.${headingsKey}`)}</h1>
    <p class="text-neutral-600 dark:text-neutral-400 italic">
      {$translate(`app.subheadings.${headingsKey}`)}
    </p>
  </div>

  <div class="mb-6">
    <TextInput
      type="textarea"
      bind:value={description}
      {readonly}
      name="description"
      invalid={error}
      maxlength={max}
      rows={2}
      bind:focus={focusInput}
    />
  </div>

  <Button text={$translate('app.buttons.view_summary')} on:click={() => next()}>
    <div slot="iconRight" class="w-6 -rotate-90">
      {@html arrow}
    </div>
  </Button>
</section>
