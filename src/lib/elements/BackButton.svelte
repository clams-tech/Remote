<script lang="ts">
	import { t } from '$lib/i18n/translations'

	import Caret from '$lib/icons/Caret.svelte'
</script>

<div
	on:click
	class="fixed top-0 z-10 left-0 flex items-center p-4 cursor-pointer font-bold text-inherit"
>
	<div class="w-7 cursor-pointer">
		<Caret direction="left" />
	</div>
	<span>{$t('app.buttons.back')}</span>
</div>
