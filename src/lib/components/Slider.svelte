<script lang="ts">
  import noUiSlider, { type API, type target } from 'nouislider'
  import 'nouislider/dist/nouislider.css'
  import { onDestroy, createEventDispatcher } from 'svelte'

  let slider: target | HTMLDivElement
  let sliderInstance: API
  const dispatch = createEventDispatcher()

  export let totalItems: number
  export let start: number // start of range
  export let end: number // end of range

  function renderSlider() {
    if (slider) {
      sliderInstance = noUiSlider.create(slider, {
        start: [start, end],
        connect: true,
        step: 1,
        range: {
          min: 0,
          max: totalItems
        }
      })
      sliderInstance.on('change', (event) => {
        const newStart = Number(event[0])
        const newEnd = Number(event[1])
        if (newStart !== start || newEnd !== end) {
          dispatch('updateRange', { start: newStart, end: newEnd })
        }
      })
    }
  }

  $: if (slider) {
    renderSlider()
  }

  onDestroy(() => {
    sliderInstance && sliderInstance.destroy()
  })
</script>

<div class="mr-4 mb-4 ml-4 w-full">
  <div id="slider" bind:this={slider} />
</div>
