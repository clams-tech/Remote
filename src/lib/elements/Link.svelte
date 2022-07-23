<script lang="ts">
	export let href
	export let newTab = false
</script>

<a
	class="dark:text-purple-300 text-purple-500"
	{href}
	target={newTab ? '_blank' : '_self'}
	rel="noopener noreferrer"><slot /></a
>
