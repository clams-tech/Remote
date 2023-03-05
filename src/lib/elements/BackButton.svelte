<script lang="ts">
  import { translate } from '$lib/i18n/translations'
  import caret from '$lib/icons/caret'

  export let text = $translate('app.buttons.back')
</script>

<button
  on:click
  class="fixed top-1 z-10 left-0 flex items-center p-4 cursor-pointer font-bold text-inherit"
>
  <div class="w-7 cursor-pointer rotate-90">
    {@html caret}
  </div>
  <span>{text}</span>
</button>
