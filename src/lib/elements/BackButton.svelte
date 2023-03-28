<script lang="ts">
  import { translate } from '$lib/i18n/translations'
  import caret from '$lib/icons/caret'

  export let text = $translate('app.buttons.back')
</script>

<button
  on:click
  class="absolute top-0 z-10 left-0 flex items-center pt-5 pb-4 px-3 cursor-pointer font-bold text-inherit w-full bg-white dark:bg-neutral-900"
>
  <div class="w-6 cursor-pointer rotate-90">
    {@html caret}
  </div>
  <span>{text}</span>
</button>
