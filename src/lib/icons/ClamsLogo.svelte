<script>
  import { fade, draw } from 'svelte/transition'
  import { onMount } from 'svelte'
  import { quintInOut } from 'svelte/easing'

  export let max = 6
  export let min = 1

  let visible = false

  onMount(() => {
    setTimeout(() => (visible = true), 1)
  })

  function getRandom() {
    return Math.floor(Math.random() * (max - min + 1) + min) * 1000
  }

  const fadeDuration = (max - min) * 1000
  const fadeDelay = min * 1000
</script>

<div class="flex items-center justify-center w-full h-full">
  {#if visible}
    <svg width="100%" viewBox="0 0 151 147" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        in:draw={{ duration: getRandom(), easing: quintInOut }}
        d="M83.4 77.2L92 63L83.4 77.2Z"
        stroke="currentColor"
        stroke-miterlimit="10"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        in:draw={{ duration: getRandom(), easing: quintInOut }}
        d="M68.9 77.2L60.3 63L68.9 77.2Z"
        stroke="currentColor"
        stroke-miterlimit="10"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        in:draw={{ duration: getRandom(), easing: quintInOut }}
        d="M52.6 62.0001L35.4 42.3C33.9 44.5 32.5 46.7 31.4 49.1C30.8 50.4 31.1 52.0001 32.2 52.9001L62.4 77.3H65.8L52.6 62.0001Z"
        stroke="currentColor"
        stroke-miterlimit="10"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        in:draw={{ duration: getRandom(), easing: quintInOut }}
        d="M68.9001 77.1999L60.3001 62.9999L40 29.3999C37.6 31.5999 35.5001 33.9999 33.6001 36.4999C32.7001 37.6999 32.8001 39.2999 33.8001 40.3999L52.7001 61.9999L66 77.1999H68.9001Z"
        stroke="currentColor"
        stroke-miterlimit="10"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        in:draw={{ duration: getRandom(), easing: quintInOut }}
        d="M65.9001 77.2L52.6001 62L65.9001 77.2Z"
        stroke="currentColor"
        stroke-miterlimit="10"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        in:draw={{ duration: getRandom(), easing: quintInOut }}
        d="M60.3002 63.0001L68.9001 77.2001H71.6001L48.2001 16.6001C44.9001 18.6001 41.9002 20.9001 39.3002 23.4001C38.3002 24.4001 38.1002 26.0001 38.8002 27.2001L40.1001 29.4001L60.3002 63.0001Z"
        stroke="currentColor"
        stroke-miterlimit="10"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        in:draw={{ duration: getRandom(), easing: quintInOut }}
        d="M40 29.3999L60.3 62.9999L40 29.3999Z"
        stroke="currentColor"
        stroke-miterlimit="10"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        in:draw={{ duration: getRandom(), easing: quintInOut }}
        d="M73.9002 77.2001L64.6002 18.8001L62.7002 6.6001C61.5002 7.0001 60.2001 7.40012 59.0001 7.90012C55.5001 9.20012 52.3002 11.0001 49.3002 12.9001C48.1002 13.7001 47.6002 15.2001 48.1002 16.6001L71.5001 77.2001H73.9002V77.2001Z"
        stroke="currentColor"
        stroke-miterlimit="10"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        in:draw={{ duration: getRandom(), easing: quintInOut }}
        d="M89.8 77.2L120 52.8C121.1 51.9 121.5 50.3 120.8 49C119.7 46.7 118.3 44.4 116.8 42.2L99.6 61.9L86.4 77.2H89.8Z"
        stroke="currentColor"
        stroke-miterlimit="10"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        in:draw={{ duration: getRandom(), easing: quintInOut }}
        d="M83.4 77.1999H86.4L99.7 61.9999L118.6 40.3999C119.6 39.2999 119.6 37.6999 118.8 36.4999C116.9 33.9999 114.8 31.5999 112.4 29.3999L92.1 62.9999L83.4 77.1999Z"
        stroke="currentColor"
        stroke-miterlimit="10"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        in:draw={{ duration: getRandom(), easing: quintInOut }}
        d="M86.4 77.2L99.6 62L86.4 77.2Z"
        stroke="currentColor"
        stroke-miterlimit="10"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        in:draw={{ duration: getRandom(), easing: quintInOut }}
        d="M83.4 77.2001L92 63.0001L112.3 29.4001L113.6 27.2001C114.3 26.0001 114.1 24.4001 113.1 23.4001C110.4 20.9001 107.5 18.6001 104.2 16.6001L80.8 77.2001H83.4Z"
        stroke="currentColor"
        stroke-miterlimit="10"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        in:draw={{ duration: getRandom(), easing: quintInOut }}
        d="M92 62.9999L112.3 29.3999L92 62.9999Z"
        stroke="currentColor"
        stroke-miterlimit="10"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        in:draw={{ duration: getRandom(), easing: quintInOut }}
        d="M104.2 16.6001C104.7 15.3001 104.2 13.7001 103 12.9001C100 10.9001 96.8 9.20012 93.3 7.90012C92.1 7.40012 90.8 7.0001 89.6 6.6001L87.7 18.8001L78.4 77.2001H80.8L104.2 16.6001Z"
        stroke="currentColor"
        stroke-miterlimit="10"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        in:draw={{ duration: getRandom(), easing: quintInOut }}
        d="M89.6 6.29999C89.8 4.79999 88.9 3.29999 87.4 2.89999C86.8 2.69999 86.6 2.39999 80.8 1.39999C79.8 1.19999 78.5 1 76.8 1C76.4 1 75.8 1 75.2 1C73.5 1.1 72.2 1.29999 71.2 1.39999C65.5 2.39999 65.3 2.69999 64.6 2.89999C63.1 3.29999 62.2 4.79999 62.4 6.29999C66.4 31.5 69.8 52.8 73.7 77.2H78.1C82.2 52.8 85.6 31.6 89.6 6.29999Z"
        stroke="currentColor"
        stroke-miterlimit="10"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        in:draw={{ duration: getRandom(), easing: quintInOut }}
        d="M1 77.2H150.5"
        stroke="currentColor"
        stroke-miterlimit="10"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        in:draw={{ duration: getRandom(), easing: quintInOut }}
        d="M150.5 119.9H1"
        stroke="currentColor"
        stroke-miterlimit="10"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        in:draw={{ duration: getRandom(), easing: quintInOut }}
        d="M134.5 128.7H17.1001"
        stroke="currentColor"
        stroke-miterlimit="10"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        in:draw={{ duration: getRandom(), easing: quintInOut }}
        d="M118.4 137.6H33.1001"
        stroke="currentColor"
        stroke-miterlimit="10"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        in:draw={{ duration: getRandom(), easing: quintInOut }}
        d="M102.4 146.4H49.2002"
        stroke="currentColor"
        stroke-miterlimit="10"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        in:fade={{ delay: fadeDelay, duration: fadeDuration, easing: quintInOut }}
        d="M26.5 88.3999C25.3 89.5999 24.3 91.0999 23.5 92.6999C22.7 94.4999 22.3 96.3999 22.3 98.2999C22.3 102.4 23.7 105.9 26.5 108.7V88.3999Z"
        fill="currentColor"
      />
      <path
        in:fade={{ delay: fadeDelay, duration: fadeDuration, easing: quintInOut }}
        d="M45.9999 87.3C45.3999 86.8 44.1999 85.9 42.4999 85.1C40.7999 84.4 38.9 84 36.9 84C33.4 84 30.4 85.1 27.7 87.3V109.8C30.4 112 33.5 113.1 36.9 113.1C38.9 113.1 40.7999 112.7 42.4999 112C44.2999 111.2 45.5999 110.2 45.9999 109.9C46.2999 109.6 46.6 109.4 46.7 109.2L43.9999 106.5L43.3 107.2L45.2 109.1C42.8 111 40 112 36.8 112C33.7 112 31 111.1 28.6 109.2V87.8C31 86 33.7 85 36.8 85C40.1 85 42.9 86 45.2 87.9L43.3 89.8L43.9999 90.5L46.7 87.8C46.5 87.8 46.2999 87.6 45.9999 87.3Z"
        fill="currentColor"
      />
      <path
        in:fade={{ delay: fadeDelay, duration: fadeDuration, easing: quintInOut }}
        d="M53.8 84.6001H49.9L49.8 85.6001V112.6H53.8V84.6001Z"
        fill="currentColor"
      />
      <path
        in:fade={{ delay: fadeDelay, duration: fadeDuration, easing: quintInOut }}
        d="M55.8999 111.5V84.6001H54.8999V112.6H64.6999V111.5H55.8999Z"
        fill="currentColor"
      />
      <path
        in:fade={{ delay: fadeDelay, duration: fadeDuration, easing: quintInOut }}
        d="M86.4999 108.8H84.2999L78.6999 92.3L71.8999 112.6H72.9999L73.8999 109.8H83.4999L84.3999 112.6H85.4999L84.5999 109.8H86.3999V108.8H86.4999ZM74.2999 108.8L78.7999 95.6L83.1999 108.8H74.2999Z"
        fill="currentColor"
      />
      <path
        in:fade={{ delay: fadeDelay, duration: fadeDuration, easing: quintInOut }}
        d="M78.1 90.5999L76.1 84.7L66.5 112.6H70.7L78.1 90.5999Z"
        fill="currentColor"
      />
      <path
        in:fade={{ delay: fadeDelay, duration: fadeDuration, easing: quintInOut }}
        d="M94.2 84.6001H90.2V85.6001V112.6H94.2V84.6001Z"
        fill="currentColor"
      />
      <path
        in:fade={{ delay: fadeDelay, duration: fadeDuration, easing: quintInOut }}
        d="M110.5 86.3001C109.3 85.2001 107.8 84.6001 106 84.6001H105.7V112.6H106.7V85.6001C108 85.7001 109 86.3001 109.9 87.2001C110.7 88.2001 111.2 89.3001 111.2 90.5001V112.5H112.3V90.5001C112.4 88.8001 111.8 87.4001 110.5 86.3001Z"
        fill="currentColor"
      />
      <path
        in:fade={{ delay: fadeDelay, duration: fadeDuration, easing: quintInOut }}
        d="M104.7 112.6V84.6001H100.7V87.2001C99.5001 85.5001 97.8001 84.6001 95.4001 84.6001H95.1001V112.6H96.2001V85.6001C97.4001 85.7001 98.5001 86.2001 99.3001 87.2001C100.2 88.1001 100.6 89.2001 100.6 90.4001V112.6H104.7Z"
        fill="currentColor"
      />
      <path
        in:fade={{ delay: fadeDelay, duration: fadeDuration, easing: quintInOut }}
        d="M123.6 84.5C121.1 85.4 119.3 87.7 119.3 90.5C119.3 93.3 121.1 95.7 123.6 96.5V84.5Z"
        fill="currentColor"
      />
      <path
        in:fade={{ delay: fadeDelay, duration: fadeDuration, easing: quintInOut }}
        d="M123.6 104.3C121.5 104.3 119.4 104.3 117.3 104.3C117.3 108.2 120 111.4 123.6 112.4V104.3Z"
        fill="currentColor"
      />
      <path
        in:fade={{ delay: fadeDelay, duration: fadeDuration, easing: quintInOut }}
        d="M131.1 90.5001H128.4V91.5001H132.1V90.5001C132.1 87.0001 129.2 84.1001 125.7 84.1001C125.4 84.1001 125 84.1001 124.7 84.2001V84.7001V85.2001V95.9001V96.4001V96.9001C125 96.9001 125.3 97.0001 125.7 97.0001C129.8 97.0001 133.1 100.3 133.1 104.4C133.1 108.5 129.8 111.8 125.7 111.8V104.3H124.7V111.6V112.1V112.6C125 112.6 125.3 112.7 125.7 112.7C130.3 112.7 134 109 134 104.4C134 99.8001 130.3 96.1001 125.7 96.1001V85.3001C128.7 85.1001 131.1 87.5001 131.1 90.5001Z"
        fill="currentColor"
      />
    </svg>
  {/if}
</div>
