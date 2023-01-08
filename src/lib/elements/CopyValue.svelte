<script lang="ts">
  import { translate } from '$lib/i18n/translations'
  import check from '$lib/icons/check'
  import copy from '$lib/icons/copy'
  import { writeClipboardValue } from '$lib/utils'
  import { onDestroy } from 'svelte'
  import Button from './Button.svelte'

  export let value: string

  let copySuccess: boolean
  let copyAnimationTimeout: NodeJS.Timeout

  async function copyValue() {
    copySuccess = await writeClipboardValue(value)

    if (copySuccess) {
      copyAnimationTimeout = setTimeout(() => (copySuccess = false), 3000)
    }
  }

  onDestroy(() => {
    copyAnimationTimeout && clearTimeout(copyAnimationTimeout)
  })
</script>

<div
  class="p-2 rounded flex justify-between items-center text-white font-bold w-full bg-neutral-900 dark:text-neutral-900 dark:bg-white"
>
  <div class="text-sm bg-neutral-900 dark:bg-white w-full text-white dark:text-neutral-900">
    {value}
  </div>

  <div>
    <Button on:click={copyValue} small text={$translate('app.buttons.copy')}>
      <div class="w-4" slot="iconRight">{@html copySuccess ? check : copy}</div>
    </Button>
  </div>
</div>
