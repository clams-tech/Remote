<script lang="ts">
  import { page } from '$app/stores'
  import { translate } from '$lib/i18n/translations.js'
  export let text = $translate(`app.routes.${$page.url.pathname}.title`)
  export let icon: string
</script>

<div class="flex items-center mb-6">
  <div class="w-10 mr-2">{@html icon}</div>
  <h1 class="text-4xl font-bold">
    {text}
  </h1>
</div>
