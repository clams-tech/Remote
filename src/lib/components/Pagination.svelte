<script lang="ts">
  import caret from '$lib/icons/caret'

  export let currentPage: number
  export let items: any[]
  export let itemsPerPage: number

  const totalPages = Math.ceil(items.length / itemsPerPage)

  function handlePrevClick() {
    if (currentPage > 1) {
      currentPage--
    }
  }

  function handleNextClick() {
    if (currentPage < totalPages) {
      currentPage++
    }
  }
</script>

<div class="flex justify-center mt-4">
  <button disabled={currentPage === 1} on:click={handlePrevClick}>
    <div class="w-6 cursor-pointer rotate-90">
      {@html caret}
    </div></button
  >
  <p class="ml-2 mr-2 text-sm">
    {currentPage} / {Math.ceil(items.length / itemsPerPage)}
  </p>
  <button
    disabled={currentPage === Math.ceil(items.length / itemsPerPage)}
    on:click={handleNextClick}
  >
    <div class="w-6 cursor-pointer rotate-90 scale-y-[-1]">
      {@html caret}
    </div></button
  >
</div>
