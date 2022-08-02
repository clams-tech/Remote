<script lang="ts">
	export let href: string
	export let newTab = false

	const target = newTab ? { target: '_blank' } : {}
</script>

<a class="dark:text-purple-300 text-purple-500" {href} {...target} rel="noopener noreferrer"
	><slot /></a
>
