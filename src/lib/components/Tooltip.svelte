<script lang="ts">
  import infoIcon from '$lib/icons/info'
  export let text = ''
</script>

<div class="group relative inline-block cursor-pointer">
  <div class="w-3.5 border border-current rounded-full flex-shrink-0">
    {@html infoIcon}
  </div>

  <div
    class="bg-white text-black absolute bottom-full left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-[5px] py-1.5 px-3.5 text-sm opacity-0 group-hover:opacity-100"
  >
    <span
      class=" bg-white text-black absolute bottom-[-3px] left-1/2 -z-10 h-2 w-2 -translate-x-1/2 rotate-45 text-sm"
    />
    {text}
  </div>
</div>
