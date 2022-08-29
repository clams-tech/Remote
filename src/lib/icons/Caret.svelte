<script lang="ts">
  export let direction: 'up' | 'down' | 'right' | 'left' = 'down'

  const rotateStyle =
    direction === 'up'
      ? 'rotate-180'
      : direction === 'left'
      ? 'rotate-90'
      : direction === 'right'
      ? '-rotate-90'
      : ''
</script>

<svg
  class={rotateStyle}
  width="100%"
  height="100%"
  viewBox="0 0 30 30"
  fill="none"
  xmlns="http://www.w3.org/2000/svg"
>
  <path
    d="M8.19485 10.3661L15 16.9822L21.8051 10.3661C22.3073 9.87796 23.1213 9.87796 23.6234 10.3661C24.1255 10.8543 24.1255 11.6457 23.6234 12.1339L15.9091 19.6339C15.407 20.122 14.593 20.122 14.0909 19.6339L6.37658 12.1339C5.87447 11.6457 5.87447 10.8543 6.37658 10.3661C6.87868 9.87796 7.69275 9.87796 8.19485 10.3661Z"
    fill="currentColor"
  />
</svg>
