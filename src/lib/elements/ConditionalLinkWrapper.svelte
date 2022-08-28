<script lang="ts">
  export let href = ''
  export let target = ''
  export let rel = ''
</script>

{#if href}
  <a class="no-underline" {href} {target} {rel}><slot /></a>
{:else}
  <slot />
{/if}
