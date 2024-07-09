<script lang="ts">
  export let text = ''
</script>

<div class="group relative inline-block border">
  <button class="bg-primary inline-flex rounded text-base font-medium text-white">?</button>
  <div
    class="bg-white text-black absolute bottom-full left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-[5px] py-1.5 px-3.5 text-sm text-white opacity-0 group-hover:opacity-100"
  >
    <span
      class=" bg-white text-black absolute bottom-[-3px] left-1/2 -z-10 h-2 w-2 -translate-x-1/2 rotate-45"
    />
    {text}
  </div>
</div>
